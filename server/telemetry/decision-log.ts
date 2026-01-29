import fs from "fs";
import path from "path";

export type DecisionRecord = {
  /**
   * Canonical timestamp.
   * Keep BOTH `ts` and `at` for compatibility across the codebase.
   */
  ts: string; // ISO timestamp
  at: string; // ISO timestamp (alias)

  // request context
  route: string;
  requestId?: string;

  // Stage 4: which gate handled the response
  stage?: string;
  reason?: string;

  // execution facts (observability only)
  shortCircuited?: boolean;
  rewritten?: boolean;
  modelCallCount?: number;
  memoryReadCount?: number;

  // policy-relevant metadata (no secrets)
  voiceMode?: string;
  allowMemoryReferences?: boolean;
  model?: string;
  apiEndpoint?: string;
};

const MAX_PER_USER = 200;

// userKey -> ring buffer
const store = new Map<string, DecisionRecord[]>();

// Stage 4.1: append-only local log (best-effort)
const LOG_DIR = process.env.NOVA_LOG_DIR || path.join(process.cwd(), ".nova");
const LOG_PATH =
  process.env.NOVA_DECISION_LOG_PATH || path.join(LOG_DIR, "gate-decisions.jsonl");

function ensureLogPath() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, "", "utf8");
  } catch {
    // best-effort
  }
}

function appendToFile(line: string) {
  try {
    ensureLogPath();
    fs.appendFileSync(LOG_PATH, line + "\n", "utf8");
  } catch {
    // best-effort
  }
}

type RecordDecisionInput = Omit<DecisionRecord, "ts" | "at"> & {
  ts?: string;
  at?: string;
};

export function recordDecision(userKey: string, record: RecordDecisionInput) {
  const iso = record.ts || record.at || new Date().toISOString();

  const entry: DecisionRecord = {
    ts: iso,
    at: iso,
    ...record,
    ts: iso,
    at: iso,
  };

  const arr = store.get(userKey) ?? [];
  arr.push(entry);

  if (arr.length > MAX_PER_USER) {
    arr.splice(0, arr.length - MAX_PER_USER);
  }

  store.set(userKey, arr);

  // Append-only local log (Stage 4.1)
  appendToFile(JSON.stringify({ userKey, ...entry }));
}

export function getRecentDecisions(userKey: string, limit = 10): DecisionRecord[] {
  const arr = store.get(userKey) ?? [];
  return arr.slice(Math.max(0, arr.length - limit));
}

export function getLastDecision(userKey: string): DecisionRecord | null {
  const arr = store.get(userKey) ?? [];
  return arr.length ? arr[arr.length - 1] : null;
}

export function getDecisionLogCount(userKey: string): number {
  return (store.get(userKey) ?? []).length;
}

export function getLastDecisionGlobal(): { userKey: string; decision: DecisionRecord } | null {
  let best: { userKey: string; decision: DecisionRecord } | null = null;

  for (const [userKey, arr] of store.entries()) {
    const d = arr[arr.length - 1];
    if (!d) continue;

    if (!best || d.ts > best.decision.ts) {
      best = { userKey, decision: d };
    }
  }

  return best;
}

export function clearDecisionLog(userKey: string) {
  store.delete(userKey);

  try {
    ensureLogPath();
    fs.writeFileSync(LOG_PATH, "", "utf8");
  } catch {
    // best-effort
  }
}

export function __getDecisionLogPathForDebug() {
  return LOG_PATH;
}

export function __resetDecisionLogForTests() {
  store.clear();
  try {
    ensureLogPath();
    fs.writeFileSync(LOG_PATH, "", "utf8");
  } catch {
    // ignore
  }
}
