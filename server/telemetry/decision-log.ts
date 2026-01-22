export type DecisionRecord = {
  at: string; // ISO timestamp
  route: string;
  stage?: string; // "stage1_..." | "stage2_..." | "llm_call" etc
  shortCircuited?: boolean;
  rewritten?: boolean;
  reason?: string; // optional "greeting" | "ellipsis" | etc
};

const MAX_PER_USER = 50;

// userKey -> ring buffer
const store = new Map<string, DecisionRecord[]>();

export function recordDecision(userKey: string, record: Omit<DecisionRecord, "at">) {
  const entry: DecisionRecord = { at: new Date().toISOString(), ...record };

  const arr = store.get(userKey) ?? [];
  arr.push(entry);

  if (arr.length > MAX_PER_USER) {
    arr.splice(0, arr.length - MAX_PER_USER);
  }

  store.set(userKey, arr);
}

export function getRecentDecisions(userKey: string, limit = 10): DecisionRecord[] {
  const arr = store.get(userKey) ?? [];
  return arr.slice(Math.max(0, arr.length - limit));
}

// Test helper (safe to keep; only used in unit tests if imported)
export function __resetDecisionLogForTests() {
  store.clear();
}
