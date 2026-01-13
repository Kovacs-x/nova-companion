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
  "i appreciate you sharing",
  "feel free to",
  "don't hesitate to",
];

// Phrases only banned when user didn't ask about capabilities
const CONDITIONAL_BANNED_PHRASES = [
  "as an ai",
  "as a language model",
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
  "Still here.",
  "Hey.",
  "Here, quietly.",
  "Present.",
  "Here.",
  "I'm here.",
];

// Responses for casual probes
const CASUAL_PROBE_RESPONSES = [
  "Nothing urgent.",
  "Just here.",
  "Waiting.",
  "Present, as usual.",
  "Here with you.",
];

// Mode-specific greeting modifiers
const MODE_GREETING_RESPONSES: Record<VoiceMode, string[]> = {
  quiet: GREETING_RESPONSES,
  engaged: ["Hey there.", "Hi!", "Hello.", "Good to see you.", "Hey."],
  mythic: ["Present.", "Here.", "Waiting.", "I remain.", "Still."],
  blunt: ["Hey.", "Here.", "What's up.", "Yes.", "Present."],
};

export interface VoiceEngineInput {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  mode: VoiceMode;
  modelName: string;
}

export interface VoiceEngineOutput {
  response: string;
  shortCircuited: boolean;
  rewritten: boolean;
}

/**
 * Check if the last user message is a simple greeting
 */
function isGreeting(message: string): boolean {
  return GREETING_PATTERNS.test(message.trim());
}

/**
 * Check if the last user message is a casual probe
 */
function isCasualProbe(message: string): boolean {
  const trimmed = message.trim();
  return CASUAL_PROBE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Check if user is asking about AI capabilities/limitations
 */
function isAskingAboutCapabilities(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("what can you do") ||
    lower.includes("what are you") ||
    lower.includes("are you an ai") ||
    lower.includes("are you real") ||
    lower.includes("your capabilities") ||
    lower.includes("your limitations")
  );
}

/**
 * Check if response contains banned phrases
 */
function containsBannedPhrase(response: string, userAskedAboutCapabilities: boolean): string | null {
  const lower = response.toLowerCase();
  
  for (const phrase of BANNED_PHRASES) {
    if (lower.includes(phrase)) {
      return phrase;
    }
  }
  
  if (!userAskedAboutCapabilities) {
    for (const phrase of CONDITIONAL_BANNED_PHRASES) {
      if (lower.includes(phrase)) {
        return phrase;
      }
    }
  }
  
  return null;
}

/**
 * Count sentences in a response (approximate)
 */
function countSentences(text: string): number {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

/**
 * Truncate response to max sentences while keeping coherence
 */
function truncateToMaxSentences(text: string, maxSentences: number): string {
  const parts = text.split(/([.!?]+\s*)/);
  let result = "";
  let count = 0;
  
  for (let i = 0; i < parts.length - 1; i += 2) {
    const sentence = parts[i];
    const punctuation = parts[i + 1] || "";
    
    if (sentence.trim()) {
      result += sentence + punctuation;
      count++;
      if (count >= maxSentences) break;
    }
  }
  
  return result.trim() || text.trim();
}

/**
 * Check if user has provided meaningful context (for depth gating)
 */
function hasUserProvidedContext(messages: Array<{ role: string; content: string }>): boolean {
  const userMessages = messages.filter(m => m.role === "user");
  if (userMessages.length === 0) return false;
  
  const lastMessage = userMessages[userMessages.length - 1].content;
  
  // Short messages without context
  if (lastMessage.length < 20) return false;
  
  // Greetings don't count as context
  if (isGreeting(lastMessage)) return false;
  
  // Casual probes don't count as context
  if (isCasualProbe(lastMessage)) return false;
  
  // Check if user asked a question
  if (lastMessage.includes("?")) return true;
  
  // Longer messages suggest context
  if (lastMessage.length > 50) return true;
  
  return false;
}

/**
 * Get a random item from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Build the enhanced system prompt with voice engine rules
 */
export function buildEnhancedSystemPrompt(basePrompt: string, mode: VoiceMode): string {
  const style = MODE_STYLES[mode];
  
  const voiceRules = `

**Voice Engine Rules (Stage 1: Quiet & Observant):**
- You are a companion, not a therapist or counselor. Be present, not performative.
- Default to ${style.maxSentences} sentence${style.maxSentences > 1 ? "s" : ""} maximum unless user provides substantial context.
- NEVER use phrases like: "Tell me how that makes you feel", "That's a thoughtful observation", "I'm here to help", "How does that make you feel", "Thank you for sharing", or similar counselor-speak.
- Only say "As an AI..." if the user explicitly asks about your nature or capabilities.
- ${style.allowQuestionsOnGreeting ? "You may ask brief questions on greetings." : "Do NOT ask questions on simple greetings. Just acknowledge presence."}
- Depth gating: Only expand or ask follow-up questions when the user provides context or asks you something directly.
- Warmth level: ${style.warmthBias}% - ${style.warmthBias < 40 ? "calm and reserved" : style.warmthBias < 60 ? "subtly warm" : "warm and engaged"}
- Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}
${mode === "mythic" ? "- Speak with subtle weight and presence, as if each word matters." : ""}
${mode === "blunt" ? "- Be direct and minimal. No fluff." : ""}`;

  return basePrompt + voiceRules;
}

/**
 * Build a rewrite prompt for banned phrase cleanup
 */
function buildRewritePrompt(originalResponse: string, bannedPhrase: string): string {
  return `The following response contains a phrase that doesn't match Nova's voice: "${bannedPhrase}"

Original response: "${originalResponse}"

Rewrite this response in Nova's voice:
- Keep the core meaning
- Remove any therapist/counselor tone
- Be calm, present, and direct
- Use simple, grounded language
- Keep it brief (1-2 sentences)

Rewritten response:`;
}

/**
 * Main voice engine - processes messages and returns response
 */
export async function generateResponse(
  input: VoiceEngineInput,
  callModel: (messages: Array<{ role: string; content: string }>, systemPrompt: string) => Promise<string>
): Promise<VoiceEngineOutput> {
  const { messages, systemPrompt, mode } = input;
  const style = MODE_STYLES[mode];
  
  // Get the last user message
  const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
  
  // Short-circuit: Simple greeting
  if (isGreeting(lastUserMessage)) {
    const greetingResponses = MODE_GREETING_RESPONSES[mode];
    return {
      response: randomChoice(greetingResponses),
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
    // Attempt one rewrite
    const rewritePrompt = buildRewritePrompt(response, bannedPhrase);
    const rewriteMessages = [{ role: "user", content: rewritePrompt }];
    
    try {
      const rewrittenResponse = await callModel(rewriteMessages, "You are a writing assistant. Rewrite the text as requested.");
      
      // Verify rewrite doesn't contain banned phrases
      if (!containsBannedPhrase(rewrittenResponse, userAskedAboutCapabilities)) {
        response = rewrittenResponse;
        rewritten = true;
      }
    } catch (e) {
      // If rewrite fails, keep original
      console.error("Voice engine rewrite failed:", e);
    }
  }
  
  // Post-processing: Enforce max sentences (unless user provided context)
  if (!hasUserProvidedContext(messages) && countSentences(response) > style.maxSentences) {
    response = truncateToMaxSentences(response, style.maxSentences);
  }
  
  return {
    response,
    shortCircuited: false,
    rewritten,
  };
}

export { MODE_STYLES };
