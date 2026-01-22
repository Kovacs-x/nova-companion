import { describe, it, expect, vi } from "vitest";
import { generateResponse } from "../voice-engine";

describe("voice-engine: no hidden rewrite call", () => {
  it("never calls callModel more than once, even when response contains a banned phrase", async () => {
    const callModel = vi.fn(async () => "Tell me how that makes you feel.");

    const result = await generateResponse({
      mode: "quiet",
      systemPrompt: "You are Nova.",
      messages: [{ role: "user", content: "I'm stressed today." }],
      callModel,
    });

    // Single causal chain: exactly one model call.
    expect(callModel).toHaveBeenCalledTimes(1);

    // We sanitize locally (deterministic), never rewrite via another model call.
    expect(result.rewritten).toBe(true);
    expect(result.response.toLowerCase()).not.toContain(
      "tell me how that makes you feel",
    );
  });
});
