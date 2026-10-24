import { boolean, check, integer, jsonb, pgTable, primaryKey, text, timestamp, unique, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roomMembers = pgTable("room_members", {
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: varchar("role", { length: 16 }).notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.roomId, table.userId] })]);

export const roomInvites = pgTable("room_invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  role: varchar("role", { length: 16 }).notNull().default("member"),
  usesLimit: integer("uses_limit").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("room_invites_uses_limit_check", sql`${table.usesLimit} between 1 and 100`),
  check("room_invites_uses_check", sql`${table.uses} between 0 and ${table.usesLimit}`),
]);

export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 240 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("todo"),
  version: integer("version").notNull().default(1),
  assigneeId: text("assignee_id"),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeItems = pgTable("knowledge_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const knowledgeVersions = pgTable("knowledge_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => knowledgeItems.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  content: text("content").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("proposed"),
  proposedBy: text("proposed_by").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("knowledge_versions_item_version_unique").on(table.itemId, table.version)]);

export const knowledgeApprovals = pgTable("knowledge_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull().references(() => knowledgeItems.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  approvedBy: text("approved_by").notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [unique("knowledge_approvals_item_version_unique").on(table.itemId, table.version)]);

export const activityEvents = pgTable("activity_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  type: varchar("type", { length: 64 }).notNull(),
  subjectId: text("subject_id"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
