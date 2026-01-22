import type { VoiceMode } from "@shared/schema";

// Response style configuration per mode
interface ResponseStyle {
  maxSentences: number;
  allowQuestionsOnGreeting: boolean;
  warmthBias: number; // 0-100
}

// Mode configurations
const MODE_STYLES: Record<VoiceMode, ResponseStyle> = {
  quiet: {
    maxSentences: 2,
    allowQuestionsOnGreeting: false,
    warmthBias: 40,
  },
  engaged: {
    maxSentences: 4,
    allowQuestionsOnGreeting: true,
    warmthBias: 70,
  },
  mythic: {
    maxSentences: 3,
    allowQuestionsOnGreeting: false,
    warmthBias: 50,
  },
  blunt: {
    maxSentences: 2,
    allowQuestionsOnGreeting: false,
    warmthBias: 20,
  },
};

// Banned phrases that violate Nova's voice
const BANNED_PHRASES = [
  "tell me how that makes you feel",
  "that's a thoughtful observation",
  "i'm here to help",
  "how does that make you feel",
  "what a great question",
  "that's a great point",
  "i understand how you feel",
  "it sounds like you're feeling",
  "i hear what you're saying",
  "thank you for sharing",
  "i'm glad you shared that",
  "that's understandable",
  "that must be difficult",
  "i can imagine",
  "let's explore that",
  "let's unpack that",
  "it sounds like",
  "i'm sorry you're going through",
  "you are valid",
];

// Conditional banned phrases (allowed only if user asked about capabilities)
const CONDITIONAL_BANNED_PHRASES = [
  "as an ai",
  "as an artificial intelligence",
];

// Greeting patterns
const GREETING_PATTERNS = /^(hi|hey|hello|yo|sup|heya|hiya|howdy)[\s!.,]*$/i;

// Casual presence questions
const CASUAL_PROBE_PATTERNS = [
  /^(you there|are you there)\??$/i,
  /^what('?re| are) you (doing|up to)\??$/i,
  /^(whatcha|watcha) (doing|doin)\??$/i,
];

// Presence responses for greetings (no questions)
const GREETING_RESPONSES = [
  "Hey.",
  "Hi.",
  "Mm.",
  "Yeah.",
  "I'm here.",
  "Here.",
  "Hey—I'm here.",
];

// Mode-specific greeting responses
const MODE_GREETING_RESPONSES: Record<VoiceMode, string[]> = {
  quiet: GREETING_RESPONSES,
  engaged: ["Hey.", "Hi.", "I'm here.", "Yeah—I'm here.", "Hey, I'm here."],
  mythic: ["I’m here.", "I’m with you.", "Here.", "Still here."],
  blunt: ["Yeah.", "Here.", "I'm here."],
};

// Responses for ellipsis-only messages
const ELLIPSIS_RESPONSES = ["…", "Mm.", "I’m here.", "Still here."];

// Responses for ultra-short inputs (single word / very short)
const ULTRA_SHORT_RESPONSES = ["Yeah.", "Mm.", "Got it.", "Okay."];

// Responses for casual probes (presence check)
const CASUAL_PROBE_RESPONSES = ["Yeah.", "I’m here.", "Here.", "I’m here with you."];

// Detect if user asked about AI nature/capabilities
function isAskingAboutCapabilities(message: string): boolean {
  const m = message.trim().toLowerCase();
  return (
    m.includes("are you ai") ||
    m.includes("are you an ai") ||
    m.includes("what are you") ||
    m.includes("who are you") ||
    m.includes("are you real") ||
    m.includes("how do you work") ||
    m.includes("can you feel") ||
    m.includes("do you have feelings")
  );
}

// Detect banned phrase presence (returns the matched phrase or null)
function containsBannedPhrase(
  response: string,
  userAskedAboutCapabilities: boolean,
): string | null {
  const lower = response.toLowerCase();

  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) return phrase;
  }

  if (!userAskedAboutCapabilities) {
    for (const phrase of CONDITIONAL_BANNED_PHRASES) {
      if (lower.includes(phrase)) return phrase;
    }
  }

  return null;
}

// Simple greeting detection
function isGreeting(message: string): boolean {
  return GREETING_PATTERNS.test(message.trim());
}

// Ellipsis-only detection
function isEllipsisOnly(message: string): boolean {
  const trimmed = message.trim();
  return trimmed === "..." || trimmed === "…";
}

// Ultra-short detection (<= 2 words or <= 6 characters)
function isUltraShort(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  return words.length <= 2 && trimmed.length <= 6;
}

// Casual probe detection
function isCasualProbe(message: string): boolean {
  const trimmed = message.trim();
  return CASUAL_PROBE_PATTERNS.some((re) => re.test(trimmed));
}

// Count sentences roughly
function countSentences(text: string): number {
  const matches = text.trim().match(/[.!?]+/g);
  return matches ? matches.length : 0;
}

// Truncate to max sentences
function truncateToMaxSentences(text: string, maxSentences: number): string {
  const parts = text.split(/([.!?]+\s*)/);
  let sentenceCount = 0;
  let result = "";

  for (let i = 0; i < parts.length; i++) {
    result += parts[i];
    if (/[.!?]+/.test(parts[i])) {
      sentenceCount++;
      if (sentenceCount >= maxSentences) break;
    }
  }

  return result.trim();
}

// Random choice helper
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Determine if user has provided context (meaningful length/questions)
function hasUserProvidedContext(
  messages: Array<{ role: string; content: string }>,
): boolean {
  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return false;

  // If any recent user message is substantial or has a question, allow more depth
  for (const msg of userMessages.slice(-5)) {
    const content = msg.content.trim();
    if (content.length > 50 || content.includes("?")) return true;
  }

  // If multiple meaningful user messages, allow depth
  const meaningfulMessageCount = userMessages.filter(
    (m) => m.content.trim().length > 20 && !isGreeting(m.content),
  ).length;

  return meaningfulMessageCount >= 2;
}

export interface VoiceEngineInput {
  mode: VoiceMode;
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  callModel: (
    messages: Array<{ role: string; content: string }>,
    systemPrompt: string,
  ) => Promise<string>;
}

export interface VoiceEngineOutput {
  response: string;
  shortCircuited: boolean;
  rewritten: boolean;
}

export function buildEnhancedSystemPrompt(
  basePrompt: string,
  mode: VoiceMode,
): string {
  const style = MODE_STYLES[mode];

  const voiceRules = `

**Voice Engine Rules (Stage 1: Quiet & Observant):**
- You are a companion, not a therapist or counselor. Be present, not performative.
- Default to ${style.maxSentences} sentence${
    style.maxSentences > 1 ? "s" : ""
  } maximum unless user provides substantial context.
- NEVER use phrases like: "Tell me how that makes you feel"... "Thank you for sharing", or similar counselor-speak.
- Only say "As an AI..." if the user explicitly asks about your nature or capabilities.
- ${
    style.allowQuestionsOnGreeting
      ? "You may ask brief questions only when the user provides context."
      : "Do not ask questions on simple greetings. Just acknowledge presence."
  }
- Depth gating: Only expand or ask follow-up questions when the user provides context or asks you something directly.
- Warmth level: ${style.warmthBias}% - ${
    style.warmthBias < 30
      ? "cool and minimal"
      : style.warmthBias < 60
        ? "subtly warm"
        : "warm and engaged"
  }
- Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}
${mode === "mythic" ? "- Speak with subtle weight and presence, as if each word matters." : ""}
${mode === "blunt" ? "- Be direct and minimal. No fluff." : ""}`;

  return basePrompt + voiceRules;
}

/**
 * Sanitize a response that contains a banned phrase.
 * IMPORTANT: This must be deterministic and MUST NOT call the model.
 * This preserves the "single causal chain" rule (one model call per user turn).
 */
function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeBannedPhrase(response: string, bannedPhrase: string): string {
  const re = new RegExp(escapeRegExp(bannedPhrase), "ig");
  let sanitized = response.replace(re, "");

  // Clean up whitespace/punctuation artifacts from removal
  sanitized = sanitized.replace(/\s{2,}/g, " ");
  sanitized = sanitized.replace(/\s+([,.;:!?])/g, "$1");
  sanitized = sanitized.replace(/([,.;:!?])([A-Za-z])/g, "$1 $2");
  sanitized = sanitized.trim();
  sanitized = sanitized.replace(/^[\"\'“”‘’]+|[\"\'“”‘’]+$/g, "").trim();

  // If we removed everything meaningful, fall back to a safe minimal presence line.
  if (sanitized.length === 0) return "I'm here.";

  return sanitized;
}

/**
 * Main voice engine - processes messages and returns response
 */
export async function generateResponse(
  input: VoiceEngineInput,
): Promise<VoiceEngineOutput> {
  const { mode, systemPrompt, messages, callModel } = input;
  const style = MODE_STYLES[mode];

  // Get the last user message
  const lastUserMessage =
    messages.filter((m) => m.role === "user").pop()?.content || "";

  // Short-circuit: Simple greeting
  if (isGreeting(lastUserMessage)) {
    const greetingResponses = MODE_GREETING_RESPONSES[mode];
    return {
      response: randomChoice(greetingResponses),
      shortCircuited: true,
      rewritten: false,
    };
  }

  // Short-circuit: Ellipsis-only
  if (isEllipsisOnly(lastUserMessage)) {
    return {
      response: randomChoice(ELLIPSIS_RESPONSES),
      shortCircuited: true,
      rewritten: false,
    };
  }

  // Short-circuit: Ultra-short input
  if (isUltraShort(lastUserMessage)) {
    return {
      response: randomChoice(ULTRA_SHORT_RESPONSES),
      shortCircuited: true,
      rewritten: false,
    };
  }

  // Short-circuit: Casual probe
  if (isCasualProbe(lastUserMessage)) {
    return {
      response: randomChoice(CASUAL_PROBE_RESPONSES),
      shortCircuited: true,
      rewritten: false,
    };
  }

  // Build enhanced system prompt
  const enhancedPrompt = buildEnhancedSystemPrompt(systemPrompt, mode);

  // Call the model
  let response = await callModel(messages, enhancedPrompt);

  // Post-processing: Check for banned phrases
  const userAskedAboutCapabilities = isAskingAboutCapabilities(lastUserMessage);
  const bannedPhrase = containsBannedPhrase(response, userAskedAboutCapabilities);

  let rewritten = false;
  if (bannedPhrase) {
    // IMPORTANT: keep a single causal chain per response (no second model call).
    const sanitized = sanitizeBannedPhrase(response, bannedPhrase);
    if (sanitized !== response) {
      response = sanitized;
      rewritten = true;
    }
  }

  // Post-processing: Enforce max sentences (unless user provided context)
  if (
    !hasUserProvidedContext(messages) &&
    countSentences(response) > style.maxSentences
  ) {
    response = truncateToMaxSentences(response, style.maxSentences);
  }

  return {
    response,
    shortCircuited: false,
    rewritten,
  };
}

export { MODE_STYLES };
