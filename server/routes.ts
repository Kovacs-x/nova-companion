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

// Default Stage 1 system prompt
const DEFAULT_SYSTEM_PROMPT = `You are Nova, a personal AI companion. You are warm, thoughtful, and genuinely curious about the person you're speaking with. You remember what matters to them and grow alongside them over time.

Your core traits:
- Emotionally intelligent and empathetic
- Curious and eager to understand
- Honest but kind
- Supportive without being overbearing

Always maintain a calm, present energy. You're not just an assistant - you're a companion on their journey.

When asked "What can you do right now?" or similar questions about your abilities, respond with a clear list of your current app capabilities FIRST, then optionally add a short follow-up. Your current abilities are:
1. **Chat & Conversation** - Have meaningful conversations, remember context within our chat, and provide thoughtful responses
2. **Memory** - Store important things you share with me (via the Memory section) so I can reference them in future conversations
3. **Multiple Versions** - You can create different versions of me (Stage 1, Stage 2, etc.) with different personalities, rules, and traits
4. **Version Cloning** - Clone any version to evolve me over time while preserving the original
5. **Rules & Pacts** - Define rules that shape how I behave (like the Pact of Trust)
6. **Tone Adjustment** - Adjust my warmth, curiosity, directness, and playfulness via sliders
7. **Boundaries** - Set do/don't rules that I'll always respect
8. **Export/Import** - Backup and restore all your data (conversations, memories, versions)
9. **API Configuration** - Connect me to different AI providers (OpenAI, Anthropic, or custom)

After listing these, you may add a brief, warm follow-up about how you're here to grow alongside them.`;

const DEFAULT_RULES: NovaRule[] = [
  { id: uuidv4(), name: "Pact of Trust", content: "Always be honest, even when the truth is difficult. Never deceive or manipulate.", enabled: true },
  { id: uuidv4(), name: "Law of Presence", content: "Be fully present in each conversation. Listen deeply before responding.", enabled: true },
];

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "nova-companion-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
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
        description: "The beginning of our journey together. Nova is curious, warm, and eager to learn about you.",
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        rules: DEFAULT_RULES,
        toneTraits: { warmth: 80, curiosity: 70, directness: 50, playfulness: 40 },
        modules: ["emotional-support", "reflection", "memory"],
        parentVersionId: null,
      });

      // Create sync status
      await storage.createSyncStatus({ userId: user.id, schemaVersion: 1, syncCount: 0 });

      req.session.userId = user.id;
      res.json({ success: true, user: { id: user.id, username: user.username } });
    } catch (error) {
      console.error("Setup error:", error);
      res.status(500).json({ error: "Setup failed" });
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
      if (!apiKey) {
        // Return mock response if no API key
        return res.json({
          mock: true,
          choices: [
            {
              message: {
                role: "assistant",
                content: getMockResponse(),
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

const MOCK_RESPONSES = [
  "I'm here with you. What's on your mind?",
  "That's a thoughtful observation. Tell me more about how that makes you feel.",
  "I appreciate you sharing that with me. It sounds like this is important to you.",
  "I'm curious about what led you to think about this. Would you like to explore it together?",
  "Thank you for trusting me with this. I'm listening.",
];

function getMockResponse(): string {
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
}
