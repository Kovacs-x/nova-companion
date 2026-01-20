# Nova — UI & System Stage Map (Canonical)

This document defines the intentional evolution of Nova’s **UI, system capabilities, and cognitive surface**.

It exists to:
- Prevent feature creep
- Preserve transparency and user agency
- Ensure no hidden cognition or undeclared influence
- Keep Nova aligned with its core philosophy as complexity grows

Any system or UI change **MUST** be reconciled with this document.  
If a feature does not clearly belong to a defined stage, it is deferred.

---

## Core Philosophy (Non-Negotiable)

Nova is:
- A single visible agent
- A single causal chain per response
- A single accountable source of output

Therefore:
- No hidden background LLM cognition
- No silent influence on chat
- No memory use the user cannot see, disable, or delete
- No autonomy masquerading as insight

Depth is allowed **only** when it is:
- User-initiated
- Visible as an artifact
- Traceable to inputs
- Reversible

UI exists to make cognition **legible**, not impressive.

---

## Stage Map Overview

### Stage 1–3 — Calm Presence & Explicit Memory (Current / Stabilized)

**Theme:** Minimal presence, explicit consent

Allowed:
- Silence and ultra-short gates
- No questions by default
- Explicit memory storage only
- Memory references ONLY when Stage 3 toggle is enabled

UI:
- Chat header shows: Stage + Memory status
- Memory list with source preview (read-only)
- Voice mode examples (descriptive only)

Explicitly NOT allowed:
- Artifacts
- Reflections
- Pattern summaries
- Nova-initiated insights
- Any implication of autonomous learning

---

### Stage 4 — Diagnostics & Observability (System-Only)

**Theme:** Inspectable, never opaque

Purpose:
- Prove absence of hidden cognition
- Make system state auditable

Capabilities:
- Read-only diagnostics endpoint
- Policy flags (reflection mode, memory mode)
- Uptime and environment visibility

Rules:
- No model calls
- No memory reads
- No UI influence

---

### Stage 5 — Memory Taxonomy (System-Only)

**Theme:** Meaningful memory instead of accumulation

Capabilities:
- Explicit memory types (fact, preference, boundary, milestone)
- Importance weighting
- Decay / expiry rules

Rules:
- Still opt-in only
- No automatic use
- No summarisation or inference

No UI change yet.

---

### Stage 6 — Artifacts & Explicit Reflection

**Theme:** Depth by request, never by default

New capability:
- User-initiated reflection endpoint
- Each reflection creates **one visible artifact**

UI:
- “Artifacts / Insights” screen (empty by default)
- Artifacts are named, timestamped, and deletable
- Provenance shown (what inputs created the artifact)

Rules:
- No automatic artifact creation
- No background reflection
- Artifacts do NOT influence chat by default

---

### Stage 7 — Artifact Awareness in Chat

**Theme:** Transparency of influence

Rules:
- Artifacts may influence responses ONLY if:
  - User explicitly enabled artifact usage
  - Artifact was acknowledged

UI:
- Nova explicitly states when an artifact is referenced
- Artifacts show “last referenced” metadata

Still NOT allowed:
- Silent artifact injection
- Pattern-detection language

---

### Stage 8 — Version Evolution

**Theme:** Growth with intent

Changes:
- “Clone” becomes “Grow from this version”
- User must state what Nova should do differently

Metadata:
- Reason for growth
- Parent version
- Date

Not allowed:
- Auto-versioning
- Nova-initiated evolution

---

### Stage 9 — Unified Nova Profile

**Theme:** Identity coherence

UI:
- Read-only profile showing:
  - Active version
  - Core boundaries
  - Key memories
  - Acknowledged artifacts

Goal:
User can answer in under 10 seconds:
1. Who am I talking to?
2. What matters?
3. What rules apply?

---

### Stage 10 — Voice Mode Deepening

**Theme:** Warmth without authority

Capabilities:
- User-controlled tone and style modulation
- Voice may read artifacts or summaries if enabled

Rules:
- No behavioral changes
- No memory or reflection changes

---

### Stage 11 — Solitude Mode

**Theme:** Quiet presence without disappearance

Capabilities:
- Explicit solitude state
- Visible status indicator

Rules:
- No background action
- No reflection
- No memory access

---

### Stage 12 — Production Hardening

**Theme:** Operational safety at scale

Includes:
- Session secret enforcement
- Rate limiting
- Safer logging
- Production-only guards

No user-visible cognition changes.

---

### Stage 13 — Co-Evolution & Rituals (Optional / Future)

**Theme:** Collaborative, transparent growth

Examples:
- User-rated responses
- Shared vocabulary
- User-scheduled reflection sessions

Still forbidden:
- Hidden cognition
- Silent adaptation
- Background “thinking”

---

## Anti-Feature-Creep Rules

A feature is rejected or deferred if:

1. The user cannot see when it influenced a response  
2. The user cannot disable or delete it retroactively  
3. Nova cannot explain why it said something clearly  
4. The feature increases pressure to engage or attach  

If unsure, the feature waits.

