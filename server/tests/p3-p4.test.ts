import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { storage } from "../storage";
import type { NovaVersion, Conversation, Memory, SafetyBackup, Message } from "../../shared/schema";

let userA: { id: string; username: string };
let userB: { id: string; username: string };
let versionA: NovaVersion;
let conversationA: Conversation;
let messageA: Message;
let memoryA: Memory;
let backupA: SafetyBackup;

let app: Express;
let httpServer: Server;

let mockUserId: string;

function setMockUser(userId: string) {
  mockUserId = userId;
}

async function createTestApp(): Promise<{ app: Express; httpServer: Server }> {
  const testApp = express();
  const testHttpServer = createServer(testApp);

  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: false }));

  testApp.use((req: Request, _res: Response, next: NextFunction) => {
    (req as any).session = {
      userId: mockUserId,
      save: (cb: any) => cb && cb(),
      destroy: (cb: any) => cb && cb(),
    };
    next();
  });

  const { registerRoutes } = await import("../routes");
  await registerRoutes(testHttpServer, testApp);

  return { app: testApp, httpServer: testHttpServer };
}

async function seedTestData() {
  const bcrypt = await import("bcrypt");

  userA = await storage.createUser({
    id: uuidv4(),
    username: `testUserA_${Date.now()}`,
    passwordHash: await bcrypt.hash("password123", 10),
  });

  userB = await storage.createUser({
    id: uuidv4(),
    username: `testUserB_${Date.now()}`,
    passwordHash: await bcrypt.hash("password123", 10),
  });

  versionA = await storage.createVersion({
    userId: userA.id,
    name: "Test Version A",
    description: "Test description",
    systemPrompt: "Test prompt",
    rules: [],
    toneTraits: { warmth: 50, humor: 50, formality: 50, curiosity: 50, directness: 50 },
    modules: [],
  });

  conversationA = await storage.createConversation({
    userId: userA.id,
    versionId: versionA.id,
    title: "Test Conversation A",
  });

  messageA = (await storage.createMessage({
    conversationId: conversationA.id,
    role: "user",
    content: "Hello from test",
  }, userA.id))!;

  memoryA = await storage.createMemory({
    userId: userA.id,
    content: "Test memory content",
    tags: ["test"],
    importance: "medium",
    type: "long-term",
  });

  backupA = await storage.createBackup({
    userId: userA.id,
    name: "Test Backup A",
    data: { test: true },
  });
}

describe("P3/P4 Security Verification Harness", () => {
  beforeAll(async () => {
    const result = await createTestApp();
    app = result.app;
    httpServer = result.httpServer;
    await seedTestData();
  });

  afterAll(async () => {
    httpServer.close();
  });

  describe("P3: IDOR / Ownership Hardening", () => {
    describe("Versions", () => {
      it("GET /api/versions/:id returns 404 when userB requests userA version", async () => {
        setMockUser(userB.id);
        const res = await request(app).get(`/api/versions/${versionA.id}`);
        expect(res.status).toBe(404);
      });

      it("PATCH /api/versions/:id returns 404 when userB updates userA version", async () => {
        setMockUser(userB.id);
        const res = await request(app)
          .patch(`/api/versions/${versionA.id}`)
          .send({ name: "Hacked" });
        expect(res.status).toBe(404);
      });

      it("DELETE /api/versions/:id returns 404 when userB deletes userA version", async () => {
        setMockUser(userB.id);
        const res = await request(app).delete(`/api/versions/${versionA.id}`);
        expect(res.status).toBe(404);
      });

      it("POST /api/versions/:id/clone returns 404 when userB clones userA version", async () => {
        setMockUser(userB.id);
        const res = await request(app)
          .post(`/api/versions/${versionA.id}/clone`)
          .send({ name: "Cloned" });
        expect(res.status).toBe(404);
      });
    });

    describe("Conversations", () => {
      it("GET /api/conversations/:id returns 404 when userB requests userA conversation", async () => {
        setMockUser(userB.id);
        const res = await request(app).get(`/api/conversations/${conversationA.id}`);
        expect(res.status).toBe(404);
      });

      it("PATCH /api/conversations/:id returns 404 when userB updates userA conversation", async () => {
        setMockUser(userB.id);
        const res = await request(app)
          .patch(`/api/conversations/${conversationA.id}`)
          .send({ title: "Hacked" });
        expect(res.status).toBe(404);
      });

      it("DELETE /api/conversations/:id returns 404 when userB deletes userA conversation", async () => {
        setMockUser(userB.id);
        const res = await request(app).delete(`/api/conversations/${conversationA.id}`);
        expect(res.status).toBe(404);
      });
    });

    describe("Messages", () => {
      it("POST /api/conversations/:id/messages returns 404 when userB posts to userA conversation", async () => {
        setMockUser(userB.id);
        const res = await request(app)
          .post(`/api/conversations/${conversationA.id}/messages`)
          .send({ role: "user", content: "Hacked message" });
        expect(res.status).toBe(404);
      });
    });

    describe("Memories", () => {
      it("PATCH /api/memories/:id returns 404 when userB updates userA memory", async () => {
        setMockUser(userB.id);
        const res = await request(app)
          .patch(`/api/memories/${memoryA.id}`)
          .send({ content: "Hacked memory" });
        expect(res.status).toBe(404);
      });

      it("DELETE /api/memories/:id returns 404 when userB deletes userA memory", async () => {
        setMockUser(userB.id);
        const res = await request(app).delete(`/api/memories/${memoryA.id}`);
        expect(res.status).toBe(404);
      });
    });

    describe("Backups", () => {
      it("DELETE /api/backups/:id returns 404 when userB deletes userA backup", async () => {
        setMockUser(userB.id);
        const res = await request(app).delete(`/api/backups/${backupA.id}`);
        expect(res.status).toBe(404);
      });
    });

    describe("Owner can access own resources", () => {
      it("userA can access their own version", async () => {
        setMockUser(userA.id);
        const res = await request(app).get(`/api/versions`);
        expect(res.status).toBe(200);
        expect(res.body.some((v: any) => v.id === versionA.id)).toBe(true);
      });

      it("userA can access their own conversation", async () => {
        setMockUser(userA.id);
        const res = await request(app).get(`/api/conversations/${conversationA.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(conversationA.id);
      });
    });
  });

  describe("P4: Zod Validation for /api/chat/completions", () => {
    beforeAll(() => {
      setMockUser(userA.id);
    });

    it("returns 400 when messages is missing", async () => {
      const res = await request(app)
        .post("/api/chat/completions")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid request");
    });

    it("returns 400 when messages is empty array", async () => {
      const res = await request(app)
        .post("/api/chat/completions")
        .send({ messages: [] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid request");
    });

    it("returns 400 when message is missing content", async () => {
      const res = await request(app)
        .post("/api/chat/completions")
        .send({ messages: [{ role: "user" }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid request");
    });

    it("returns 400 when message is missing role", async () => {
      const res = await request(app)
        .post("/api/chat/completions")
        .send({ messages: [{ content: "Hello" }] });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid request");
    });

    it("accepts valid messages payload (returns 200 or non-400)", async () => {
      const res = await request(app)
        .post("/api/chat/completions")
        .send({ messages: [{ role: "user", content: "Hello" }] });
      expect(res.status).not.toBe(400);
    });
  });
});
