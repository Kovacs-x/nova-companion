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
  import { Router } from "express";
  import { z } from "zod";
  import { getRecentDecisions } from "../telemetry/decision-log";

  const DiagnosticsResponseSchema = z.object({
    ok: z.literal(true),
    now: z.string(),
    uptimeSec: z.number(),
    env: z.object({
      nodeEnv: z.string().optional(),
    }),
    build: z.object({
      appVersion: z.string().optional(),
      gitCommit: z.string().optional(),
    }),
    policy: z.object({
      noHiddenBackgroundCognition: z.literal(true),
      reflection: z.object({
        mode: z.literal("user-invoked-only"),
      }),
      memory: z.object({
        mode: z.literal("opt-in-only"),
      }),
      artifacts: z.object({
        mode: z.literal("off"),
      }),
    }),
  });

export function createDiagnosticsRouter() {
  const router = Router();

  router.get("/diagnostics", (_req, res) => {
    const payload = {
      ok: true as const,
      now: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
      env: {
        nodeEnv: process.env.NODE_ENV,
      },
      build: {
        appVersion: process.env.APP_VERSION,
        gitCommit: process.env.GIT_COMMIT,
      },
      policy: {
        noHiddenBackgroundCognition: true as const,
        reflection: { mode: "user-invoked-only" as const },
        memory: { mode: "opt-in-only" as const },
      },
    };

    const parsed = DiagnosticsResponseSchema.safeParse(payload);
    if (!parsed.success) {
      return res.status(500).json({ ok: false, error: "Diagnostics schema mismatch" });
    }

    return res.status(200).json(parsed.data);
  });

    return router;
  }
