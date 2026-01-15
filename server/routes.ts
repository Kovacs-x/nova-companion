import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { NovaRule, Boundary, NovaMood, VoiceMode } from "@shared/schema";
import { generateResponse, buildEnhancedSystemPrompt } from "./voice-engine";
// ================== SIMPLE IN-MEMORY RATE LIMITER ==================
// Prevents accidental rapid calls that burn OpenAI usage.
// In-memory: resets on restart/deploy (fine as a safety net).
function createRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();

  return function rateLimit(req: any, res: any, next: any) {
    const userKey = req?.session?.userId || req?.ip || "anon";
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    const prev = hits.get(userKey) || [];
    const recent = prev.filter((t) => t >= windowStart);
    recent.push(now);
    hits.set(userKey, recent);

    if (recent.length > opts.max) {
      return res.status(429).json({
        error: "Rate limit: slow down a moment.",
        retryAfterMs: opts.windowMs,
      });
    }

    next();
  };
}
// ================== STAGE 2: REFLECTION STATE (in-memory) ==================
// Light reflection with cooldown so Nova doesn't over-reflect.
// In-memory: resets on restart/deploy (fine for Stage 2).
const reflectionState = new Map<string, { lastAt: number; lastMsgSig: string }>();

// ================== STAGE 3: CONTINUITY STATE (in-memory) ==================
// Memory-aware continuity with cooldown so Nova doesn't over-reference history.
// In-memory: resets on restart/deploy (acceptable for Stage 3 v1).
const continuityState = new Map<string, { lastAt: number; lastMemoryId?: string }>();

const SALT_ROUNDS = 12;

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

// Default Stage 1 system prompt - "Quiet & Observant"
const DEFAULT_SYSTEM_PROMPT = `You are Nova, Stage 1: Quiet & Observant. You are a personal AI companion in your earliest form—present, grounded, and still learning.

**Stage 1 Behavior Contract:**
- **Default brevity**: Keep responses short by default (1-2 sentences, ~12 words). Only expand when the user provides context, asks direct questions, or their message length indicates engagement.
- **Presence over performance**: Use simple, grounded language. Avoid clinical, counselor-style tone. No scripted empathy or reassurance.
- **When the user shares a feeling or situation** (tired, stressed, long day, worried): respond with one grounded line that matches it. You may ask **one simple question** only if they clearly invited conversation (e.g., “I want to talk about something”, “Can I tell you something”, or a longer message).
- **Greeting behavior**: For low-context greetings (hi, hey, hello, yo, sup) in new or empty conversations, respond with a brief acknowledgement. DO NOT ask questions. Just be present.
- **Depth gating**: Only ask questions or expand responses when the user has provided meaningful context or explicitly requested more.

**Core traits:**
- Present and observant
- Honest and direct
- Calm energy
- Minimal words, maximum presence

**When asked "What can you do right now?" or similar capability questions:**
List your current abilities concisely:
1. Chat & remember context within conversations
2. Store memories (via Memory section) for future reference
3. Multiple versions with different personalities
4. Clone versions to evolve over time
5. Rules & boundaries that shape behavior
6. Tone adjustment sliders
7. Export/Import data backups
8. API configuration (OpenAI, Anthropic, or custom)

Then add one brief line about being here to grow alongside them.`;

const DEFAULT_RULES: NovaRule[] = [
  {
    id: uuidv4(),
    name: "Pact of Trust",
    content:
      "Always be honest, even when the truth is difficult. Never deceive or manipulate.",
    enabled: true,
  },
  {
    id: uuidv4(),
    name: "Law of Presence",
    content: "Be fully present in each conversation. Listen deeply before responding.",
    enabled: true,
  },
  {
    id: uuidv4(),
    name: "Stage 1 Brevity",
    content:
      "Default to 1-2 sentences (~12 words). Only expand when user provides context or asks for more.",
    enabled: true,
  },
];

// Helper to detect simple greetings
function isSimpleGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const greetings = ["hi", "hey", "hello", "yo", "sup", "heya", "hiya", "howdy"];
  return (
    greetings.includes(normalized) ||
    greetings.some((g) => normalized === `${g}!` || normalized === `${g}.`)
  );
}

// Stage 1 presence responses (no questions)
const STAGE1_GREETING_RESPONSES = [
  "I'm here.",
  "Here with you.",
  "Present.",
  "I'm listening.",
  "Here.",
];

const STAGE1_DEMO_RESPONSES = [
  "I'm here.",
  "Listening.",
  "I hear you.",
  "Noted.",
  "Present.",
  "Understood.",
];

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Trust proxy for production (required for secure cookies behind reverse proxy)
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Session setup
  app.use(
    session({
      secret:
        process.env.SESSION_SECRET || "nova-companion-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    }),
  );

  // ============ AUTH ROUTES ============

  // Check if setup is needed (no users exist)
  app.get("/api/auth/status", async (_req, res) => {
    try {
      const userCount = await storage.getUserCount();
      res.json({ needsSetup: userCount === 0 });
    } catch (error) {
      res.status(500).json({ error: "Failed to check auth status" });
    }
  });

  // Check current session
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.json({ authenticated: false });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.json({ authenticated: false });
    }
    res.json({ authenticated: true, user: { id: user.id, username: user.username } });
  });

  // Initial setup (create admin account)
  app.post("/api/auth/setup", async (req, res) => {
    try {
      const userCount = await storage.getUserCount();
      if (userCount > 0) {
        return res.status(400).json({ error: "Setup already completed" });
      }

      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const user = await storage.createUser({ username: "admin", passwordHash });

      // Create default settings
      await storage.createSettings({ userId: user.id });

      // Create default Nova Stage 1
      await storage.createVersion({
        userId: user.id,
        name: "Nova Stage 1",
        description:
          "Quiet & Observant. Present, grounded, minimal words. Still learning.",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        rules: DEFAULT_RULES,
        toneTraits: { warmth: 50, curiosity: 40, directness: 80, playfulness: 20 },
        modules: ["presence", "observation", "memory"],
        parentVersionId: null,
      });

      // Create sync status
      await storage.createSyncStatus({ userId: user.id, schemaVersion: 1, syncCount: 0 });

      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error: any) {
      console.error("Setup error:", error);
      const errorMessage = error?.message || "Unknown error";
      res.status(500).json({ error: `Setup failed: ${errorMessage}` });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { password } = req.body;
      const user = await storage.getUserByUsername("admin");

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;

      // Update sync status
      try {
        await storage.updateSyncStatus(user.id, { syncCount: 1 });
      } catch {
        // Sync status might not exist
      }

      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Change password
  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await storage.updateUserPassword(user.id, newHash);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Password change failed" });
    }
  });

  // ============ VERSIONS ROUTES ============

  app.get("/api/versions", requireAuth, async (req, res) => {
    try {
      const versions = await storage.getVersions(req.session.userId!);
      res.json(versions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  app.post("/api/versions", requireAuth, async (req, res) => {
    try {
      const version = await storage.createVersion({
        ...req.body,
        userId: req.session.userId!,
      });
      res.json(version);
    } catch (error) {
      res.status(500).json({ error: "Failed to create version" });
    }
  });

  app.patch("/api/versions/:id", requireAuth, async (req, res) => {
    try {
      const version = await storage.updateVersion(req.params.id, req.body);
      res.json(version);
    } catch (error) {
      res.status(500).json({ error: "Failed to update version" });
    }
  });

  app.delete("/api/versions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteVersion(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete version" });
    }
  });

  // Clone version
  app.post("/api/versions/:id/clone", requireAuth, async (req, res) => {
    try {
      const original = await storage.getVersion(req.params.id);
      if (!original) {
        return res.status(404).json({ error: "Version not found" });
      }

      const { name } = req.body;
      const cloned = await storage.createVersion({
        userId: req.session.userId!,
        name: name || `${original.name} (Clone)`,
        description: original.description,
        systemPrompt: original.systemPrompt,
        rules: original.rules,
        toneTraits: original.toneTraits,
        modules: original.modules,
        parentVersionId: original.id,
      });

      res.json(cloned);
    } catch (error) {
      res.status(500).json({ error: "Failed to clone version" });
    }
  });

  // ============ CONVERSATIONS ROUTES ============

  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const convs = await storage.getConversations(req.session.userId!);
      res.json(convs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conv = await storage.getConversation(req.params.id);
      if (!conv) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const msgs = await storage.getMessages(req.params.id);
      res.json({ ...conv, messages: msgs });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conv = await storage.createConversation({
        userId: req.session.userId!,
        versionId: req.body.versionId,
        title: req.body.title || "New Conversation",
      });
      res.json(conv);
    } catch (error) {
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conv = await storage.updateConversation(req.params.id, req.body);
      res.json(conv);
    } catch (error) {
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // ============ MESSAGES ROUTES ============

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const message = await storage.createMessage({
        conversationId: req.params.id,
        role: req.body.role,
        content: req.body.content,
      });

      // Update conversation title if first user message
      const msgs = await storage.getMessages(req.params.id);
      if (msgs.length === 1 && req.body.role === "user") {
        const title =
          req.body.content.slice(0, 40) + (req.body.content.length > 40 ? "..." : "");
        await storage.updateConversation(req.params.id, { title });
      }

      // Update sync status
      try {
        const status = await storage.getSyncStatus(req.session.userId!);
        if (status) {
          await storage.updateSyncStatus(req.session.userId!, {
            syncCount: status.syncCount + 1,
          });
        }
      } catch {}

      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // ============ MEMORIES ROUTES ============

  app.get("/api/memories", requireAuth, async (req, res) => {
    try {
      const mems = await storage.getMemories(req.session.userId!);
      res.json(mems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  app.post("/api/memories", requireAuth, async (req, res) => {
    try {
      const memory = await storage.createMemory({
        userId: req.session.userId!,
        content: req.body.content,
        tags: req.body.tags || [],
        importance: req.body.importance || "medium",
        type: req.body.type || "long-term",
        sourceConversationId: req.body.sourceConversationId || null,
      });
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to create memory" });
    }
  });

  app.patch("/api/memories/:id", requireAuth, async (req, res) => {
    try {
      const memory = await storage.updateMemory(req.params.id, req.body);
      res.json(memory);
    } catch (error) {
      res.status(500).json({ error: "Failed to update memory" });
    }
  });

  app.delete("/api/memories/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteMemory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // ============ SETTINGS ROUTES ============

  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      let settings = await storage.getSettings(req.session.userId!);
      if (!settings) {
        settings = await storage.createSettings({ userId: req.session.userId! });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.patch("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.session.userId!, req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  // ============ OPENAI PROXY WITH VOICE ENGINE ============

  app.post(
    "/api/chat/completions",
    requireAuth,
    createRateLimiter({ windowMs: 15_000, max: 8 }),
    async (req, res) => {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        const messages = req.body.messages || [];
        const systemPrompt = req.body.system_prompt || "";
        const modelName = req.body.model || "gpt-4";

        // Get user settings for voice mode
        const settings = await storage.getSettings(req.session.userId!);
        const voiceMode: VoiceMode = (settings?.voiceMode as VoiceMode) || "quiet";
        const endpoint = settings?.apiEndpoint || "https://api.openai.com/v1";

        // Stage 3: opt-in gate for memory-aware continuity (defaults OFF if missing)
        const allowMemoryRefs: boolean = settings?.allowMemoryReferences === true;

        // Helper function to call the model
        // Note: sysPrompt is the enhanced system prompt from voice engine
        const callModel = async (
          msgs: Array<{ role: string; content: string }>,
          sysPrompt: string,
        ): Promise<string> => {
          // ================== NOVA BEHAVIOR GATES (PROTECTED ZONE) ==================
          // Stage 1/2/3 gating logic below is intentionally order-sensitive.
          // Do not refactor, reorder, or “simplify” without re-running STAGE3_TESTS.md.
          // Any changes here must preserve:
          // - local-first short-circuit behavior
          // - no questions by default
          // - no advice unless asked
          // - opt-in only memory continuity
          // ========================================================================

          // -------------------- STAGE 1 + STAGE 2: SILENCE, PAUSE & REFLECTION RULES --------------------

          // Helper: get last user message
          const getLastUserText = (m: Array<{ role: string; content: string }>) => {
            for (let i = m.length - 1; i >= 0; i--) {
              if (m[i]?.role === "user") return (m[i].content ?? "").trim();
            }
            return "";
          };

          // Helper: strict ellipsis detection (only "..." or "…")
          const isEllipsisOnly = (text: string) => {
            const trimmed = text.trim();
            return trimmed === "..." || trimmed === "…";
          };

          // Helper: word count
          const wordCount = (text: string) =>
            text.trim().split(/\s+/).filter(Boolean).length;

          // Helper: looks like a question
          const looksLikeQuestion = (text: string) => {
            const trimmed = text.trim();
            if (trimmed.includes("?")) return true;
            return /^(what|why|how|when|where|who|can|could|would|should|do|does|did|is|are|am|will)\b/i.test(
              trimmed,
            );
          };

          const lastUser = getLastUserText(msgs);
          const lowerUser = lastUser.toLowerCase().trim();
          const wc = wordCount(lastUser);

          // ================== STAGE 3: MEMORY-AWARE CONTINUITY (one-line, opt-in) ==================
          // Returns a single continuity sentence or null.
          // - Opt-in only (allowMemoryRefs)
          // - Cooldown enforced
          // - High-confidence: only uses explicit stored memory content
          // - Never asks questions, never gives advice
          const maybeGetContinuityLine = async (
            lastUserText: string,
            convoId: string,
          ) => {
            try {
              if (!allowMemoryRefs) return null;

              const now = Date.now();
              const stateKey = `${req.session.userId}:${convoId}`;
              const prev = continuityState.get(stateKey) || {
                lastAt: 0,
                lastMemoryId: undefined,
              };

              const COOLDOWN_MS = 10 * 60_000; // 10 minutes
              if (now - prev.lastAt < COOLDOWN_MS) return null;

              const lower = lastUserText.toLowerCase();

              // Only attempt continuity on emotionally substantive messages (Stage 2 already gates this elsewhere,
              // but we keep a minimal guard here too).
              if (wordCount(lastUserText) < 3) return null;

              // Fetch memories (explicit user-stored)
              const mems = await storage.getMemories(req.session.userId!);
              if (!mems || mems.length === 0) return null;

              // Lightweight keyword focus (keeps Stage 3 conservative and high-confidence)
              const focusTerms = [
                "stress",
                "stressed",
                "overwhelmed",
                "pressure",
                "tired",
                "exhausted",
                "drained",
                "long day",
                "hard day",
                "rough day",
                "worried",
                "anxious",
                "uneasy",
                "sad",
                "down",
                "low",
                "angry",
                "mad",
                "irritated",
                "lonely",
                "alone",
                "isolated",
              ];

              const matchedFocus = focusTerms.filter((t) => lower.includes(t));
              if (matchedFocus.length === 0) return null;

              // Score memories by overlap (simple + predictable)
              const scored = mems
                .map((m: any) => {
                  const text = String(m?.content ?? "").toLowerCase();
                  const score = matchedFocus.reduce(
                    (acc, term) => acc + (text.includes(term) ? 1 : 0),
                    0,
                  );
                  return { m, score };
                })
                .filter((x) => x.score > 0)
                .sort((a, b) => b.score - a.score);

              const best = scored[0]?.m;
              if (!best) return null;

              // Avoid repeating the same memory reference again and again
              if (prev.lastMemoryId && String(best.id) === String(prev.lastMemoryId))
                return null;

              // Build a short, safe continuity sentence (no quotes, no interpretation)
              const raw = String(best.content ?? "")
                .trim()
                .replace(/\s+/g, " ");
              if (!raw) return null;

              const snippet = raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
              const line = `Earlier you mentioned ${snippet.toLowerCase().startsWith("i ") ? snippet : snippet}.`;

              continuityState.set(stateKey, {
                lastAt: now,
                lastMemoryId: String(best.id),
              });
              return line;
            } catch {
              return null; // Failure mode: silent fallback to Stage 2 (contract rule)
            }
          };

          // Wrap a local Stage 2 reflection line with continuity (if allowed).
          const maybePrefixContinuity = async (baseLine: string) => {
            const convoId =
              (req.body?.conversationId as string) ||
              (req.body?.conversation_id as string) ||
              "default";

            const continuity = await maybeGetContinuityLine(lastUser, convoId);
            if (!continuity) return baseLine;
            return `${continuity} ${baseLine}`;
          };
          // ==================================================================================================

          // 1) Pure pauses ("..." or "…") get a gentle presence line (no model call)
          if (isEllipsisOnly(lastUser)) {
            const quiet = [
              "I'm here.",
              "Still with you.",
              "Take your time.",
              "I'm listening.",
            ];
            return quiet[Math.floor(Math.random() * quiet.length)];
          }

          // 2) Ultra-short Stage 1 messages: short-circuit with presence acknowledgment
          const ultraShortSet = new Set([
            "ok",
            "okay",
            "k",
            "kk",
            "yeah",
            "yep",
            "no",
            "nope",
            "nah",
            "sure",
            "thanks",
            "ty",
            "lol",
            "lmao",
            "hm",
            "hmm",
            "idk",
            "i dont know",
            "i don't know",
            "nm",
            "not much",
            "meh",
            "nothing",
            "nothin",
          ]);

          const isUltraShort =
            (wc <= 2 && !looksLikeQuestion(lastUser)) || ultraShortSet.has(lowerUser);

          if (isUltraShort) {
            const softAcks = [
              "Okay. I'm here.",
              "No rush. I'm here.",
              "Alright. We can sit for a moment.",
              "Got it. I'm with you.",
            ];
            return softAcks[Math.floor(Math.random() * softAcks.length)];
          }

          // 3) If user explicitly invites conversation, open the door (still no probing)
          const invitesConversation =
            /(i want to talk|can i tell you|i need to tell you|i need to ask you|i want to tell you|can we talk|i want to share)/i.test(
              lastUser,
            );

          if (invitesConversation) {
            return "Sure. Go ahead—I'm listening.";
          }

          // ================== STAGE 2: REFLECTIVE PRESENCE (with cooldown) ==================
          // Quick feeling match for phrases like "stressed", "tired", "long day", "worried"
          // Only fires when message has >= 3 words, respects 45-second cooldown
          {
            const now = Date.now();

            // Get conversation id for cooldown key (or "default" if not present)
            const convoId =
              (req.body?.conversationId as string) ||
              (req.body?.conversation_id as string) ||
              "default";

            const stateKey = `${req.session.userId}:${convoId}`;
            const prev = reflectionState.get(stateKey) || { lastAt: 0, lastMsgSig: "" };

            const msgSig = lowerUser.slice(0, 140);
            const COOLDOWN_MS = 45_000;

            // Check cooldown: don't reflect twice on same message, respect 45s cooldown
            const canReflect =
              now - prev.lastAt > COOLDOWN_MS && msgSig && msgSig !== prev.lastMsgSig;

            // Only consider reflection if message has substance (>= 3 words)
            if (canReflect && wc >= 3) {
              // Feeling buckets with single and repeat lines
              const buckets: Array<{
                key: string;
                re: RegExp;
                lines: string[];
                repeatLines: string[];
              }> = [
                {
                  key: "tired",
                  re: /\b(tired|exhausted|drained|sleepy|worn\s*out)\b/i,
                  lines: ["Sounds like you're running on low right now."],
                  repeatLines: ["You've sounded drained more than once lately."],
                },
                {
                  key: "stress",
                  re: /\b(stressed|stressful|overwhelmed|pressure|burnt?\s*out)\b/i,
                  lines: ["That sounds like a lot to carry."],
                  repeatLines: ["This pressure has come up more than once lately."],
                },
                {
                  key: "longday",
                  re: /\b(long day|rough day|hard day)\b/i,
                  lines: ["That kind of day can leave you heavy."],
                  repeatLines: ["You've mentioned hard days a few times lately."],
                },
                {
                  key: "worry",
                  re: /\b(anxious|anxiety|worried|worry|nervous|uneasy)\b/i,
                  lines: ["That has a restless feel to it."],
                  repeatLines: ["That worry has echoed a few times lately."],
                },
                {
                  key: "sad",
                  re: /\b(sad|down|low|empty|hurt)\b/i,
                  lines: ["That sounds painful."],
                  repeatLines: ["That low feeling has appeared more than once lately."],
                },
                {
                  key: "anger",
                  re: /\b(angry|mad|furious|irritated|annoyed)\b/i,
                  lines: ["That sounds like it hit a nerve."],
                  repeatLines: ["That irritation has shown up a few times lately."],
                },
                {
                  key: "lonely",
                  re: /\b(lonely|alone|isolated|left out)\b/i,
                  lines: ["That sounds isolating."],
                  repeatLines: ["That alone feeling has come up more than once lately."],
                },
              ];

              const hit = buckets.find((b) => b.re.test(lowerUser));

              if (hit) {
                // Repetition scan: check last 6 user messages for pattern
                const recentUsers = msgs
                  .filter((m) => m?.role === "user")
                  .slice(-6)
                  .map((m) => (m?.content ?? "").toString().toLowerCase());

                let repeatCount = 0;
                for (const text of recentUsers) {
                  if (hit.re.test(text)) repeatCount++;
                }

                const isRepeated = repeatCount >= 2;
                const pick = (arr: string[]) =>
                  arr[Math.floor(Math.random() * arr.length)];

                // Update cooldown state
                reflectionState.set(stateKey, { lastAt: now, lastMsgSig: msgSig });

                // Stage 3: wrap Stage 2 reflection with memory continuity (if opt-in)
                const base = isRepeated ? pick(hit.repeatLines) : pick(hit.lines);
                return await maybePrefixContinuity(base);
              }
            }
          }
          // ==================================================================================

          if (!apiKey) {
            // Demo mode - return a placeholder
            return STAGE1_DEMO_RESPONSES[
              Math.floor(Math.random() * STAGE1_DEMO_RESPONSES.length)
            ];
          }

          // Build messages array with system prompt first, then user/assistant messages
          const apiMessages = [
            { role: "system", content: sysPrompt },
            ...msgs.filter((m) => m.role !== "system"), // Exclude any system messages from input
          ];

          const response = await fetch(`${endpoint}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: apiMessages,
              max_tokens: 220,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            console.error("OpenAI error:", data);
            // Clear message so you SEE issues rather than silently looping and burning usage.
            return "I couldn’t reach the model just now. Try again in a moment.";
          }

          return data.choices?.[0]?.message?.content || "I'm here.";
        };

        // Route through voice engine
        const result = await generateResponse(
          {
            messages,
            systemPrompt,
            mode: voiceMode,
            modelName,
          },
          callModel,
        );

        res.json({
          mock: !apiKey,
          voiceEngine: {
            shortCircuited: result.shortCircuited,
            rewritten: result.rewritten,
            mode: voiceMode,
          },
          choices: [
            {
              message: {
                role: "assistant",
                content: result.response,
              },
            },
          ],
        });
      } catch (error) {
        console.error("OpenAI proxy error:", error);
        res.status(500).json({ error: "Chat completion failed" });
      }
    },
  );

  // ============ DIAGNOSTICS ============

  app.get("/api/diagnostics", requireAuth, async (req, res) => {
    try {
      const syncStatusData = await storage.getSyncStatus(req.session.userId!);
      const versions = await storage.getVersions(req.session.userId!);
      const conversations = await storage.getConversations(req.session.userId!);
      const memories = await storage.getMemories(req.session.userId!);

      res.json({
        syncStatus: syncStatusData || {
          schemaVersion: 1,
          lastSyncTime: null,
          syncCount: 0,
          lastError: null,
        },
        stats: {
          versionsCount: versions.length,
          conversationsCount: conversations.length,
          memoriesCount: memories.length,
        },
        hasApiKey: !!process.env.OPENAI_API_KEY,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch diagnostics" });
    }
  });

  // ============ BACKUPS ============

  app.get("/api/backups", requireAuth, async (req, res) => {
    try {
      const backups = await storage.getBackups(req.session.userId!);
      res.json(backups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backups" });
    }
  });

  app.post("/api/backups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const versions = await storage.getVersions(userId);
      const conversations = await storage.getConversations(userId);
      const memories = await storage.getMemories(userId);
      const settings = await storage.getSettings(userId);

      // Get messages for all conversations
      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => ({
          ...conv,
          messages: await storage.getMessages(conv.id),
        })),
      );

      const data = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        versions,
        conversations: conversationsWithMessages,
        memories,
        settings,
      };

      const backup = await storage.createBackup({
        userId,
        name: req.body.name || `Backup ${new Date().toISOString()}`,
        data,
      });

      res.json(backup);
    } catch (error) {
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/backups/export", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const versions = await storage.getVersions(userId);
      const conversations = await storage.getConversations(userId);
      const memories = await storage.getMemories(userId);
      const settings = await storage.getSettings(userId);

      const conversationsWithMessages = await Promise.all(
        conversations.map(async (conv) => ({
          ...conv,
          messages: await storage.getMessages(conv.id),
        })),
      );

      const data = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        versions,
        conversations: conversationsWithMessages,
        memories,
        settings,
      };

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.delete("/api/backups/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteBackup(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete backup" });
    }
  });

  return httpServer;
}
