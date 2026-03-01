import { pgTable, text, uuid, timestamp, integer, jsonb, varchar, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  apiKey: text("api_key").notNull().unique(), // ak_live_...
  retentionDays: integer("retention_days").notNull().default(90),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(), // external user id
  actorEmail: text("actor_email"),
  actorName: text("actor_name"),
  action: text("action").notNull(), // e.g. "user.login", "project.delete"
  resourceType: text("resource_type"), // e.g. "project", "invoice"
  resourceId: text("resource_id"),
  resourceName: text("resource_name"),
  metadata: jsonb("metadata"), // arbitrary extra data
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index("audit_events_workspace_idx").on(t.workspaceId),
  createdAtIdx: index("audit_events_created_at_idx").on(t.createdAt),
  actorIdx: index("audit_events_actor_idx").on(t.actorId),
}));

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("free"), // free, pro, business
  status: text("status").notNull().default("active"), // active, canceled, past_due
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  user: one(users, { fields: [workspaces.userId], references: [users.id] }),
  events: many(auditEvents),
}));

export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  workspace: one(workspaces, { fields: [auditEvents.workspaceId], references: [workspaces.id] }),
}));

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  secret: text("secret").notNull(), // HMAC signing secret
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index("webhooks_workspace_idx").on(t.workspaceId),
}));

export const webhooksRelations = relations(webhooks, ({ one }) => ({
  workspace: one(workspaces, { fields: [webhooks.workspaceId], references: [workspaces.id] }),
}));

// Types
export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
