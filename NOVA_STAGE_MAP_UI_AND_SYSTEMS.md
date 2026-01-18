# Nova — UI & System Stage Map (Canonical)

This document defines the intentional evolution of Nova’s UI and cognitive surface.

It exists to:
- Prevent feature creep
- Preserve transparency and user agency
- Ensure no hidden cognition or undeclared influence
- Keep Nova aligned with its core philosophy as complexity grows

Any system or UI change MUST be reconciled with this document.
If a feature does not clearly belong to a defined stage, it is deferred.
## Core Philosophy (Non-Negotiable)

Nova is:
- A single visible agent
- A single causal chain per response
- A single accountable source of “thinking”

Therefore:
- No hidden background LLM cognition
- No silent influence on chat
- No memory use the user cannot see, disable, or delete
- No autonomy masquerading as insight

Depth is allowed ONLY when it is:
- User-initiated
- Visible as an artifact
- Traceable to inputs
- Reversible

UI exists to make cognition legible, not impressive.
## Stage Map Overview

### Stage 1–3 (Current / Stabilized)
Theme: Calm Presence + Explicit Memory

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
### Stage 4 — Explicit Reflection & Artifacts
Theme: Depth by Request

New capability:
- User-initiated reflection endpoint
- Each reflection creates ONE visible artifact

UI:
- New “Insights / Artifacts” screen (empty by default)
- Artifacts are named, timestamped, deletable

Rules:
- No automatic artifact creation
- No background reflection
- No artifact influences chat unless explicitly enabled later
### Stage 5 — Artifact Awareness in Chat
Theme: Transparency of Influence

Rules:
- Artifacts may influence responses ONLY if:
  - User acknowledged them
  - User enabled artifact usage

UI:
- Nova explicitly states when an artifact is referenced
- Artifacts show “last referenced” metadata

Still NOT allowed:
- Silent artifact injection
- Pattern-detection language
### Stage 6 — Version Evolution
Theme: Growth With Intent

Changes:
- “Clone” → “Grow from this version”
- User must state what Nova should do differently

Metadata:
- Reason for growth
- Parent version
- Date

Not allowed:
- Auto-versioning
- Nova-initiated evolution
### Stage 7 — Unified Nova Profile
Theme: Identity Coherence

UI:
- Read-only profile showing:
  - Active version
  - Core boundaries
  - Key memories
  - Acknowledged artifacts

Goal:
User can answer in <10 seconds:
1. Who am I talking to?
2. What matters?
3. What rules apply?
### Stage 8+ — Co-Evolution (Optional / Future)
Theme: Collaborative, Transparent Growth

Examples:
- User-rated responses
- Shared vocabulary
- Scheduled reflection sessions (explicit)

Still forbidden:
- Hidden cognition
- Silent adaptation
- Background “thinking”
## Anti-Feature-Creep Rules

A feature is rejected or deferred if:

1. The user cannot see when it influenced a response
2. The user cannot disable or delete it retroactively
3. Nova cannot explain why it said something clearly
4. The feature increases pressure to engage or attach

If unsure, the feature waits.
