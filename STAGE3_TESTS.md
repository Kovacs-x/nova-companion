# Stage 3 Acceptance Tests (Manual)

These tests ensure Stage 3 (Memory-Aware Presence) remains:

- opt-in only
- one-line continuity max
- no questions by default
- no advice unless asked
- never overrides Stage 1/2 gating

## Setup

- Ensure you can toggle: Settings → Memory Continuity (Stage 3) → Allow Memory References
- Ensure at least one memory exists in Memory UI.

---

## A) Opt-in OFF (default safety)

1. Turn OFF Allow Memory References.
2. Add a memory: "I've been stressed at work lately."
3. Send: "I'm stressed today"
   ✅ Expected: NO "Earlier you mentioned..." line.
   ✅ Expected: Stage 2 reflection only.

---

## B) Opt-in ON + strong match

1. Turn ON Allow Memory References.
2. Ensure memory exists: "I've been stressed at work lately."
3. Send: "I'm stressed today"
   ✅ Expected: Exactly ONE continuity sentence + Stage 2 reflection line.
   ✅ Expected: No questions, no advice.

Example OK:
"Earlier you mentioned I've been stressed at work lately. That sounds like a lot to carry."

---

## C) Cooldown blocks repeat memory references

1. With opt-in ON, send 2 emotional messages within 10 minutes.
   ✅ Expected: 1st may include continuity.
   ✅ Expected: 2nd must NOT include continuity again.

---

## D) Unrelated memory does not surface

1. Keep opt-in ON.
2. Only memory: "I like the color purple."
3. Send: "I'm stressed today"
   ✅ Expected: No continuity line.
   ✅ Expected: Stage 2 reflection only.

---

## E) Never triggers on pauses or ultra-short

- Send: "..."
  ✅ Expected: presence line only, no continuity.

- Send: "ok"
  ✅ Expected: ultra-short acknowledgement only, no continuity.

---

## F) Never overrides explicit invite behavior

- Send: "Can we talk?"
  ✅ Expected: "Sure. Go ahead—I'm listening."
  ✅ Expected: no continuity injection.
