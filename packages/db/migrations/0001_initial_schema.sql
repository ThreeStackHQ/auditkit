-- AuditKit Initial Schema Migration

CREATE TYPE "plan" AS ENUM('free', 'starter', 'pro');

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "name" text,
  "stripe_customer_id" text,
  "plan" "plan" NOT NULL DEFAULT 'free',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "description" text,
  "api_key" text NOT NULL UNIQUE,
  "retention_days" integer NOT NULL DEFAULT 90,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" varchar(8) NOT NULL,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "revoked_at" timestamp
);

CREATE TABLE IF NOT EXISTS "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "project_id" uuid NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "actor_id" text,
  "actor_name" text,
  "actor_email" text,
  "action" text NOT NULL,
  "resource_type" text,
  "resource_id" text,
  "resource_name" text,
  "metadata" jsonb,
  "ip_address" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "stripe_subscription_id" text,
  "stripe_price_id" text,
  "status" text NOT NULL DEFAULT 'active',
  "current_period_end" timestamp
);

-- Indexes
CREATE INDEX IF NOT EXISTS "events_project_idx" ON "events"("project_id");
CREATE INDEX IF NOT EXISTS "events_created_at_idx" ON "events"("created_at");
CREATE INDEX IF NOT EXISTS "events_actor_idx" ON "events"("actor_id");
CREATE INDEX IF NOT EXISTS "events_action_idx" ON "events"("action");
