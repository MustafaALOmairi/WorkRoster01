import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email"),
  password: text("password").notNull(),
});

export const userData = pgTable("user_data", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id),
  shiftConfig: jsonb("shift_config"),
  notes: jsonb("notes"),
  themePrefs: jsonb("theme_prefs"),
  aiThemes: jsonb("ai_themes"),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

export const sharedHolidays = pgTable("shared_holidays", {
  id: varchar("id").primaryKey(),
  holidays: jsonb("holidays").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
