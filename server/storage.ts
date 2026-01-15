import {
  users,
  novaVersions,
  conversations,
  messages,
  memories,
  userSettings,
  syncStatus,
  safetyBackups,
  type User,
  type InsertUser,
  type NovaVersion,
  type InsertNovaVersion,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Memory,
  type InsertMemory,
  type UserSettings,
  type InsertUserSettings,
  type SyncStatus,
  type InsertSyncStatus,
  type SafetyBackup,
  type InsertSafetyBackup,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: string, passwordHash: string): Promise<void>;
  getUserCount(): Promise<number>;

  // Nova Versions
  getVersions(userId: string): Promise<NovaVersion[]>;
  getVersion(id: string): Promise<NovaVersion | undefined>;
  createVersion(version: InsertNovaVersion): Promise<NovaVersion>;
  updateVersion(id: string, updates: Partial<NovaVersion>): Promise<NovaVersion>;
  deleteVersion(id: string): Promise<void>;

  // Conversations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conv: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;

  // Messages
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Memories
  getMemories(userId: string): Promise<Memory[]>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  updateMemory(id: string, updates: Partial<Memory>): Promise<Memory>;
  deleteMemory(id: string): Promise<void>;

  // User Settings
  getSettings(userId: string): Promise<UserSettings | undefined>;
  createSettings(settings: InsertUserSettings): Promise<UserSettings>;
  updateSettings(userId: string, updates: Partial<UserSettings>): Promise<UserSettings>;

  // Sync Status
  getSyncStatus(userId: string): Promise<SyncStatus | undefined>;
  createSyncStatus(status: InsertSyncStatus): Promise<SyncStatus>;
  updateSyncStatus(userId: string, updates: Partial<SyncStatus>): Promise<SyncStatus>;

  // Safety Backups
  getBackups(userId: string): Promise<SafetyBackup[]>;
  createBackup(backup: InsertSafetyBackup): Promise<SafetyBackup>;
  deleteBackup(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({ passwordHash }).where(eq(users.id, id));
  }

  async getUserCount(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  // Nova Versions
  async getVersions(userId: string): Promise<NovaVersion[]> {
    return db
      .select()
      .from(novaVersions)
      .where(eq(novaVersions.userId, userId))
      .orderBy(novaVersions.createdAt);
  }

  async getVersion(id: string): Promise<NovaVersion | undefined> {
    const [version] = await db.select().from(novaVersions).where(eq(novaVersions.id, id));
    return version || undefined;
  }

  async createVersion(version: InsertNovaVersion): Promise<NovaVersion> {
    const [created] = await db.insert(novaVersions).values(version).returning();
    return created;
  }

  async updateVersion(id: string, updates: Partial<NovaVersion>): Promise<NovaVersion> {
    const [updated] = await db
      .update(novaVersions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(novaVersions.id, id))
      .returning();
    return updated;
  }

  async deleteVersion(id: string): Promise<void> {
    await db.delete(novaVersions).where(eq(novaVersions.id, id));
  }

  // Conversations
  async getConversations(userId: string): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conv || undefined;
  }

  async createConversation(conv: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conv).returning();
    return created;
  }

  async updateConversation(
    id: string,
    updates: Partial<Conversation>,
  ): Promise<Conversation> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  async deleteConversation(id: string): Promise<void> {
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  // Messages
  async getMessages(conversationId: string): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  // Memories
  async getMemories(userId: string): Promise<Memory[]> {
    return db
      .select()
      .from(memories)
      .where(eq(memories.userId, userId))
      .orderBy(desc(memories.createdAt));
  }

  async createMemory(memory: InsertMemory): Promise<Memory> {
    const [created] = await db.insert(memories).values(memory).returning();
    return created;
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<Memory> {
    const [updated] = await db
      .update(memories)
      .set(updates)
      .where(eq(memories.id, id))
      .returning();
    return updated;
  }

  async deleteMemory(id: string): Promise<void> {
    await db.delete(memories).where(eq(memories.id, id));
  }

  // User Settings
  async getSettings(userId: string): Promise<UserSettings | undefined> {
    const [settings] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId));
    return settings || undefined;
  }

  async createSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const [created] = await db.insert(userSettings).values(settings).returning();
    return created;
  }

  async updateSettings(
    userId: string,
    updates: Partial<UserSettings>,
  ): Promise<UserSettings> {
    const [updated] = await db
      .update(userSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .returning();
    return updated;
  }

  // Sync Status
  async getSyncStatus(userId: string): Promise<SyncStatus | undefined> {
    const [status] = await db
      .select()
      .from(syncStatus)
      .where(eq(syncStatus.userId, userId));
    return status || undefined;
  }

  async createSyncStatus(status: InsertSyncStatus): Promise<SyncStatus> {
    const [created] = await db.insert(syncStatus).values(status).returning();
    return created;
  }

  async updateSyncStatus(
    userId: string,
    updates: Partial<SyncStatus>,
  ): Promise<SyncStatus> {
    const [updated] = await db
      .update(syncStatus)
      .set({ ...updates, lastSyncTime: new Date() })
      .where(eq(syncStatus.userId, userId))
      .returning();
    return updated;
  }

  // Safety Backups
  async getBackups(userId: string): Promise<SafetyBackup[]> {
    return db
      .select()
      .from(safetyBackups)
      .where(eq(safetyBackups.userId, userId))
      .orderBy(desc(safetyBackups.createdAt));
  }

  async createBackup(backup: InsertSafetyBackup): Promise<SafetyBackup> {
    const [created] = await db.insert(safetyBackups).values(backup).returning();
    return created;
  }

  async deleteBackup(id: string): Promise<void> {
    await db.delete(safetyBackups).where(eq(safetyBackups.id, id));
  }
}

export const storage = new DatabaseStorage();
