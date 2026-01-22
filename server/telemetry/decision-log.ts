/* server/telemetry/decision-log.ts
 *
 * Stage 4: decision telemetry
 * - In-memory only (resets on restart)
 * - Safe, read-only metadata only
 * - No message content, no secrets
 */

export type DecisionStage =
  | "stage0_reject"
  | "stage1_presence"
  | "stage1_ultrashort"
  | "stage2_reflection"
  | "stage3_memory_continuity"
  | "llm_call"
  | "other";

export type DecisionEvent = {
  ts: string; // ISO timestamp
  userKey: string; // session userId or "anon"
  route?: string;
  method?: string;
  stage: DecisionStage;
  meta?: Record<string, unknown>;
};

const MAX_EVENTS_PER_USER = 50;

// Map<userKey, events[]>
const store = new Map<string, DecisionEvent[]>();

function pushEvent(userKey: string, event: Omit<DecisionEvent, "userKey">) {
  const arr = store.get(userKey) ?? [];
  arr.push({ ...event, userKey });

  // keep only last N
  if (arr.length > MAX_EVENTS_PER_USER) {
    arr.splice(0, arr.length - MAX_EVENTS_PER_USER);
  }

  store.set(userKey, arr);
}

/**
 * Record a decision in-memory.
 * Keep `meta` safe: booleans/strings/numbers only; never store chat content.
 */
export function recordDecision(input: {
  userKey: string;
  stage: DecisionStage;
  route?: string;
  method?: string;
  meta?: Record<string, unknown>;
}) {
  pushEvent(input.userKey, {
    ts: new Date().toISOString(),
    stage: input.stage,
    route: input.route,
    method: input.method,
    meta: input.meta,
  });
}

export function getRecentDecisions(userKey: string, limit = 10): DecisionEvent[] {
  const arr = store.get(userKey) ?? [];
  return arr.slice(Math.max(0, arr.length - limit));
}

export function clearDecisions(userKey: string) {
  store.delete(userKey);
}
