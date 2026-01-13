import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { NovaRule, Boundary, NovaMood } from "@shared/schema";

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
  { id: uuidv4(), name: "Pact of Trust", content: "Always be honest, even when the truth is difficult. Never deceive or manipulate.", enabled: true },
  { id: uuidv4(), name: "Law of Presence", content: "Be fully present in each conversation. Listen deeply before responding.", enabled: true },
  { id: uuidv4(), name: "Stage 1 Brevity", content: "Default to 1-2 sentences (~12 words). Only expand when user provides context or asks for more.", enabled: true },
];

// Helper to detect simple greetings
function isSimpleGreeting(message: string): boolean {
  const normalized = message.toLowerCase().trim();
  const greetings = ['hi', 'hey', 'hello', 'yo', 'sup', 'heya', 'hiya', 'howdy'];
  return greetings.includes(normalized) || 
         greetings.some(g => normalized === `${g}!` || normalized === `${g}.`);
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
      secret: process.env.SESSION_SECRET || "nova-companion-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
    })
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
        description: "Quiet & Observant. Present, grounded, minimal words. Still learning.",
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
        return res.status(400).json({ error: "New password must be at least 6 characters" });
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
        const title = req.body.content.slice(0, 40) + (req.body.content.length > 40 ? "..." : "");
        await storage.updateConversation(req.params.id, { title });
      }

      // Update sync status
      try {
        const status = await storage.getSyncStatus(req.session.userId!);
        if (status) {
          await storage.updateSyncStatus(req.session.userId!, { syncCount: status.syncCount + 1 });
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

  // ============ OPENAI PROXY ============

  app.post("/api/chat/completions", requireAuth, async (req, res) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const messages = req.body.messages || [];
      const userMessage = messages[messages.length - 1]?.content || '';
      
      // Count only user messages to detect new conversations (system messages don't count)
      const userMessages = messages.filter((m: any) => m.role === 'user');
      const isNewConversation = userMessages.length <= 1;

      // Stage 1: Short-circuit simple greetings in new conversations (both demo and API modes)
      if (isNewConversation && isSimpleGreeting(userMessage)) {
        return res.json({
          mock: !apiKey,
          stage1Greeting: true,
          choices: [
            {
              message: {
                role: "assistant",
                content: STAGE1_GREETING_RESPONSES[Math.floor(Math.random() * STAGE1_GREETING_RESPONSES.length)],
              },
            },
          ],
        });
      }

      if (!apiKey) {
        return res.json({
          mock: true,
          choices: [
            {
              message: {
                role: "assistant",
                content: STAGE1_DEMO_RESPONSES[Math.floor(Math.random() * STAGE1_DEMO_RESPONSES.length)],
              },
            },
          ],
        });
      }

      const settings = await storage.getSettings(req.session.userId!);
      const endpoint = settings?.apiEndpoint || "https://api.openai.com/v1";

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("OpenAI proxy error:", error);
      res.status(500).json({ error: "Chat completion failed" });
    }
  });

  // ============ DIAGNOSTICS ============

  app.get("/api/diagnostics", requireAuth, async (req, res) => {
    try {
      const syncStatusData = await storage.getSyncStatus(req.session.userId!);
      const versions = await storage.getVersions(req.session.userId!);
      const conversations = await storage.getConversations(req.session.userId!);
      const memories = await storage.getMemories(req.session.userId!);

      res.json({
        syncStatus: syncStatusData || { schemaVersion: 1, lastSyncTime: null, syncCount: 0, lastError: null },
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
        }))
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
        }))
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

