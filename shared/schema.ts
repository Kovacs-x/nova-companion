import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User (single admin account)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Nova Versions / Stages
export const novaVersions = pgTable("nova_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  rules: jsonb("rules").$type<NovaRule[]>().notNull().default([]),
  toneTraits: jsonb("tone_traits").$type<Record<string, number>>().notNull().default({}),
  modules: text("modules").array().notNull().default([]),
  parentVersionId: uuid("parent_version_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface NovaRule {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
}

export const insertNovaVersionSchema = createInsertSchema(novaVersions).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertNovaVersion = typeof novaVersions.$inferInsert;
export type NovaVersion = typeof novaVersions.$inferSelect;

// Conversations
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  versionId: uuid("version_id").references(() => novaVersions.id).notNull(),
  title: text("title").notNull().default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  role: text("role").$type<"user" | "assistant">().notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, timestamp: true });
export type InsertMessage = typeof messages.$inferInsert;
export type Message = typeof messages.$inferSelect;

// Memories
export const memories = pgTable("memories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  tags: text("tags").array().notNull().default([]),
  importance: text("importance").$type<"low" | "medium" | "high" | "critical">().notNull().default("medium"),
  type: text("type").$type<"short-term" | "long-term">().notNull().default("long-term"),
  sourceConversationId: uuid("source_conversation_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemorySchema = createInsertSchema(memories).omit({ id: true, createdAt: true });
export type InsertMemory = typeof memories.$inferInsert;
export type Memory = typeof memories.$inferSelect;

// User Settings (non-secret)
export const userSettings = pgTable("user_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  provider: text("provider").notNull().default("openai"),
  apiEndpoint: text("api_endpoint").notNull().default("https://api.openai.com/v1"),
  modelName: text("model_name").notNull().default("gpt-4"),
  boundaries: jsonb("boundaries").$type<Boundary[]>().notNull().default([]),
  currentMood: jsonb("current_mood").$type<NovaMood>().notNull().default({
    emotion: "calm",
    intensity: 60,
    lastReflection: "Awaiting our first conversation...",
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export interface Boundary {
  id: string;
  type: "do" | "dont";
  content: string;
  enabled: boolean;
}

export interface NovaMood {
  emotion: "calm" | "curious" | "thoughtful" | "warm" | "focused";
  intensity: number;
  lastReflection: string;
}

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true, updatedAt: true });
export type InsertUserSettings = typeof userSettings.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;

// Sync Status (for diagnostics)
export const syncStatus = pgTable("sync_status", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull().unique(),
  lastSyncTime: timestamp("last_sync_time").defaultNow().notNull(),
  schemaVersion: integer("schema_version").notNull().default(1),
  lastError: text("last_error"),
  syncCount: integer("sync_count").notNull().default(0),
});

export const insertSyncStatusSchema = createInsertSchema(syncStatus).omit({ id: true });
export type InsertSyncStatus = z.infer<typeof insertSyncStatusSchema>;
export type SyncStatus = typeof syncStatus.$inferSelect;

// Safety Backups
export const safetyBackups = pgTable("safety_backups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSafetyBackupSchema = createInsertSchema(safetyBackups).omit({ id: true, createdAt: true });
export type InsertSafetyBackup = z.infer<typeof insertSafetyBackupSchema>;
export type SafetyBackup = typeof safetyBackups.$inferSelect;
