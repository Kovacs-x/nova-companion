import fs from "fs";
import path from "path";

export type DecisionRecord = {
  // ISO timestamp
  at: string;

  // request context
  route: string;
  requestId?: string;

  // Stage 4: which gate handled the response
  // Keep using the existing "stage" field name in this project.
  stage?: string; // e.g. "stage1_local_short_circuit" | "stage2_reflection" | "llm_call" | ...
  reason?: string; // e.g. "ellipsis" | "tiny_ack" | "invites_conversation" | bucket key | ...

  // execution facts (observability only)
  shortCircuited?: boolean;
  rewritten?: boolean;
  modelCallCount?: number; // Stage 4.2: should be <= 1
  memoryReadCount?: number; // counts explicit storage reads used in gate flow

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
    // best-effort: if FS is unavailable, we keep in-memory telemetry only
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

export function recordDecision(
  userKey: string,
  record: (Omit<DecisionRecord, "at"> & { at?: string }) & { ts?: string },
) {
  // Accept legacy/alternate timestamp key "ts" (callsite uses it today).
  const at = record.at || record.ts || new Date().toISOString();

  // Strip ts so it never leaks into the stored record shape.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ts, ...rest } = record;

  const entry: DecisionRecord = {
    at,
    ...rest,
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

// Single-user fallback: if diagnostics is hit without session, return most recent across users.
export function getLastDecisionGlobal(): { userKey: string; decision: DecisionRecord } | null {
  let best: { userKey: string; decision: DecisionRecord } | null = null;

  for (const [userKey, arr] of store.entries()) {
    const d = arr[arr.length - 1];
    if (!d) continue;

    if (!best || d.at > best.decision.at) {
      best = { userKey, decision: d };
    }
  }

  return best;
}

// Stage 4.1: user-deletable telemetry (clears in-memory and wipes the local file)
export function clearDecisionLog(userKey: string) {
  store.delete(userKey);

  // single-user reality: wipe the whole file
  try {
    ensureLogPath();
    fs.writeFileSync(LOG_PATH, "", "utf8");
  } catch {
    // best-effort
  }
}

// Debug-only: surfaced in diagnostics so you can see where the append-only log lives.
export function __getDecisionLogPathForDebug() {
  return LOG_PATH;
}

// Test helper (safe to keep; only used in unit tests if imported)
export function __resetDecisionLogForTests() {
  store.clear();
  try {
    ensureLogPath();
    fs.writeFileSync(LOG_PATH, "", "utf8");
  } catch {
    // ignore
  }
}
