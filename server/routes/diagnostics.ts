import express from "express";
import { getCooldownSnapshotForUser } from "../routes";
import {
  __getDecisionLogPathForDebug,
  clearDecisionLog,
  getDecisionLogCount,
  getLastDecision,
  getLastDecisionGlobal,
  getRecentDecisions,
} from "../telemetry/decision-log";

export function createDiagnosticsRouter() {
  const router = express.Router();

  // Stage 4 — Diagnostics & Observability (read-only, system-only)
  // - No model calls
  // - No memory reads
  // - No UI influence
  router.get("/diagnostics", (req, res) => {
    const nowIso = new Date().toISOString();
    const uptimeSec = Math.floor(process.uptime());
    const nodeEnv = process.env.NODE_ENV || "development";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = (req as any).session?.userId ? String((req as any).session.userId) : null;

    const globalLast = getLastDecisionGlobal();
    const userKey = sessionUserId || globalLast?.userKey || "unknown";

    const lastDecision = sessionUserId ? getLastDecision(userKey) : globalLast?.decision || null;
    const recent = userKey !== "unknown" ? getRecentDecisions(userKey, 20) : [];

    const cooldowns = userKey !== "unknown" ? getCooldownSnapshotForUser(userKey) : null;

    res.json({
      ok: true,
      now: nowIso,
      uptimeSec,
      env: { nodeEnv },
      build: {},

      // Policy flags (Stage 4 requirement): visible and conservative
      policy: {
        noHiddenBackgroundCognition: true,
        reflection: { mode: "user-invoked-only" },
        memory: { mode: "opt-in-only" },
        artifacts: { mode: "off" },
      },

      // Cooldowns (Stage 4 requirement)
      cooldowns: cooldowns
        ? {
            reflection: cooldowns.summary.reflection,
            continuity: cooldowns.summary.continuity,
            perConversation: {
              reflection: cooldowns.reflection.slice(0, 10),
              continuity: cooldowns.continuity.slice(0, 10),
            },
          }
        : {
            reflection: { convoId: "unknown", lastAt: 0, remainingMs: 0, active: false },
            continuity: { convoId: "unknown", lastAt: 0, remainingMs: 0, active: false },
            perConversation: { reflection: [], continuity: [] },
          },

      // Last decision metadata (Stage 4 requirement)
      lastDecision: lastDecision
        ? {
            ts: lastDecision.ts,
            route: lastDecision.route,
            gate: lastDecision.stage ?? null,
            reason: lastDecision.reason ?? null,
            llm: {
              called: (lastDecision.modelCallCount ?? 0) > 0,
              modelCallCount: lastDecision.modelCallCount ?? 0,
              tokens: null,
            },
            memory: {
              allowMemoryReferences: !!lastDecision.allowMemoryReferences,
              memoryReadCount: lastDecision.memoryReadCount ?? 0,
            },
          }
        : null,

      // Gate decision log (Stage 4.1 requirement)
      gateDecisionLog: {
        storage: "local",
        appendOnly: true,
        userDeletable: true,
        logPath: __getDecisionLogPathForDebug(),
        userKey,
        count: userKey !== "unknown" ? getDecisionLogCount(userKey) : 0,
        recent,
      },

      // Proof-of-absence signals (Stage 4 requirement)
      proof: {
        backgroundWork: { running: false, details: [] as string[] },
        modelCalls: {
          allowedMaxPerTurn: 1,
          lastTurnCount: lastDecision?.modelCallCount ?? 0,
        },
        memoryReads: {
          lastTurnCount: lastDecision?.memoryReadCount ?? 0,
        },
      },

      diagnosticsRequest: {
        modelCalled: false,
        memoryRead: false,
        uiInfluence: false,
      },
    });
  });

  // Stage 4.1 — user-deletable decision log
  // Diagnostics GET remains read-only; deletion is a separate endpoint.
  router.delete("/telemetry/decision-log", (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionUserId = (req as any).session?.userId ? String((req as any).session.userId) : null;
    if (!sessionUserId) {
      return res.status(401).json({ ok: false, error: "Not authenticated" });
    }

    clearDecisionLog(sessionUserId);
    return res.json({ ok: true });
  });

  return router;
}
