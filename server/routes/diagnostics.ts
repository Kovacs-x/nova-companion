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

    // Read-only, safe metadata endpoint.
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
          artifacts: { mode: "off" as const },
        },
      };

      // Lock the public contract (fail closed if we accidentally change shape)
      const parsed = DiagnosticsResponseSchema.safeParse(payload);
      if (!parsed.success) {
        return res.status(500).json({
          ok: false,
          message: "Diagnostics payload failed schema validation",
        });
      }

      return res.json(parsed.data);
    });

    // Optional: tiny “observability” window into recent routing decisions.
    // Still read-only; returns minimal fields and bounded list.
    router.get("/diagnostics/decisions", (req, res) => {
      const userKey = (req as any).session?.userId || req.ip || "anon";
      const limitRaw = req.query.limit;
      const limit =
        typeof limitRaw === "string"
          ? Math.max(1, Math.min(25, parseInt(limitRaw, 10) || 10))
          : 10;

      return res.json({
        ok: true,
        now: new Date().toISOString(),
        decisions: getRecentDecisions(String(userKey), limit),
      });
    });

    return router;
  }
