import express from "express";
import request from "supertest";
import { describe, it, expect } from "vitest";
import { createDiagnosticsRouter } from "../routes/diagnostics";

describe("Stage 4 - Diagnostics & Observability", () => {
  it("GET /api/diagnostics returns safe, read-only metadata", async () => {
    const app = express();
    app.use("/api", createDiagnosticsRouter());

    const res = await request(app).get("/api/diagnostics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);

    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("now");
    expect(typeof res.body.now).toBe("string");
    expect(res.body).toHaveProperty("uptimeSec");
    expect(typeof res.body.uptimeSec).toBe("number");

    // Policy guarantees must be explicit
    expect(res.body).toHaveProperty("policy.noHiddenBackgroundCognition", true);
    expect(res.body).toHaveProperty("policy.reflection.mode", "user-invoked-only");
    expect(res.body).toHaveProperty("policy.memory.mode", "opt-in-only");
    expect(res.body).toHaveProperty("policy.artifacts.mode", "off");

    // Must not leak secrets
    const bodyStr = JSON.stringify(res.body).toLowerCase();
    expect(bodyStr).not.toContain("session_secret");
    expect(bodyStr).not.toContain("openai_api_key");
    expect(bodyStr).not.toContain("authorization");
  });
});
