import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Saved items schema
export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  faith: text("faith").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  dateCreated: timestamp("date_created").defaultNow().notNull()
});

export const insertSavedItemSchema = createInsertSchema(savedItems).pick({
  userId: true,
  faith: true,
  title: true,
  content: true,
  type: true
});

// OpenAI requests history
export const openaiRequests = pgTable("openai_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  requestType: text("request_type").notNull(), // blessing, question, scripture
  faith: text("faith").notNull(),
  prompt: text("prompt").notNull(),
  response: jsonb("response").notNull(),
  dateCreated: timestamp("date_created").defaultNow().notNull()
});

export const insertOpenaiRequestSchema = createInsertSchema(openaiRequests).pick({
  userId: true,
  requestType: true,
  faith: true,
  prompt: true,
  response: true
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SavedItem = typeof savedItems.$inferSelect;
export type InsertSavedItem = z.infer<typeof insertSavedItemSchema>;

export type OpenaiRequest = typeof openaiRequests.$inferSelect;
export type InsertOpenaiRequest = z.infer<typeof insertOpenaiRequestSchema>;
