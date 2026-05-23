-- ─────────────────────────────────────────────────────────────────────────────
-- ContentRepurposer AI — Database Schema
-- Run this in your Supabase SQL editor or against your Postgres instance.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Plans ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL UNIQUE,           -- 'free' | 'pro' | 'business'
  display_name  TEXT NOT NULL,
  price_monthly INTEGER NOT NULL DEFAULT 0,     -- in cents (USD)
  project_limit INTEGER NOT NULL DEFAULT 3,     -- projects per calendar month
  stripe_price_id TEXT,                         -- Paddle price ID (pri_...); nullable for free
  features      JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Seed plans
INSERT INTO plans (name, display_name, price_monthly, project_limit, stripe_price_id, features) VALUES
  ('free',     'Free',     0,    3,   NULL,          '["3 projects/month","Twitter & LinkedIn","Basic outputs"]'),
  ('pro',      'Pro',      1900, 50,  'price_pro',   '["50 projects/month","All channels","Editable outputs","Priority AI"]'),
  ('business', 'Business', 4900, 500, 'price_biz',   '["500 projects/month","All channels","Team sharing","API access"]')
ON CONFLICT (name) DO NOTHING;

-- ─── Users ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL,                -- bcrypt hash; never store plaintext
  full_name       TEXT,
  plan_id         UUID NOT NULL REFERENCES plans(id),
  stripe_customer_id TEXT,                      -- Paddle customer ID (ctm_...) after checkout
  stripe_subscription_id TEXT,                  -- Paddle subscription ID (sub_...)
  subscription_status TEXT DEFAULT 'inactive',  -- 'active' | 'inactive' | 'canceled'
  subscription_ends_at TIMESTAMPTZ,
  brand_voice     TEXT DEFAULT 'professional',  -- user's preferred tone
  projects_this_month INTEGER DEFAULT 0,
  month_reset_at  TIMESTAMPTZ DEFAULT date_trunc('month', NOW()) + INTERVAL '1 month',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Connected social publishing accounts
CREATE TABLE IF NOT EXISTS social_connections (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('twitter', 'linkedin')),
  provider_user_id TEXT NOT NULL,
  display_name     TEXT,
  username         TEXT,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT,
  scopes           TEXT[] DEFAULT '{}',
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

-- ─── Projects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Untitled Project',
  source_text TEXT NOT NULL,                    -- original pasted blog/article text
  source_url  TEXT,                             -- original article URL (if imported from link)
  channels    TEXT[] NOT NULL DEFAULT '{}',     -- ['twitter','linkedin','instagram','email']
  brand_voice TEXT NOT NULL DEFAULT 'professional',
  status      TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'processing'|'done'|'failed'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: add source_url to existing projects table (safe to re-run)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ─── Outputs ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS outputs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL,                    -- 'twitter'|'linkedin'|'instagram'|'email'
  content     TEXT NOT NULL,                    -- the AI-generated content
  edited      BOOLEAN DEFAULT FALSE,            -- true if user edited it
  tokens_used INTEGER DEFAULT 0,
  model_used  TEXT DEFAULT 'llama-3.3-70b-versatile',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail for direct social publishing
CREATE TABLE IF NOT EXISTS social_publications (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  output_id        UUID NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL CHECK (provider IN ('twitter', 'linkedin')),
  provider_post_id TEXT,
  provider_url     TEXT,
  status           TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'failed')),
  error            TEXT,
  published_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user_id    ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outputs_project_id  ON outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_social_connections_user_id ON social_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_social_publications_user_id ON social_publications(user_id);
CREATE INDEX IF NOT EXISTS idx_social_publications_output_id ON social_publications(output_id);

-- ─── Updated-at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS outputs_updated_at ON outputs;
CREATE TRIGGER outputs_updated_at
  BEFORE UPDATE ON outputs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS social_connections_updated_at ON social_connections;
CREATE TRIGGER social_connections_updated_at
  BEFORE UPDATE ON social_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Monthly project counter reset function ───────────────────────────────────
-- This can be called by a cron job (Supabase cron or pg_cron) on the 1st of each month.
CREATE OR REPLACE FUNCTION reset_monthly_project_counts()
RETURNS void AS $$
BEGIN
  UPDATE users
  SET projects_this_month = 0,
      month_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE month_reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- ─── Row Level Security (Supabase RLS) ───────────────────────────────────────
-- We manage auth ourselves via JWT, so RLS is used as a defense-in-depth layer.
-- If using the service role key server-side, RLS is bypassed automatically.
ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_publications ENABLE ROW LEVEL SECURITY;

-- Plans are readable by everyone
DROP POLICY IF EXISTS "Plans are public" ON plans;
CREATE POLICY "Plans are public" ON plans FOR SELECT USING (true);

-- Users can only read/update their own row
DROP POLICY IF EXISTS "Users own their row" ON users;
CREATE POLICY "Users own their row" ON users
  FOR ALL USING (id::text = current_setting('app.user_id', true));

-- Projects scoped to owner
DROP POLICY IF EXISTS "Projects scoped to owner" ON projects;
CREATE POLICY "Projects scoped to owner" ON projects
  FOR ALL USING (user_id::text = current_setting('app.user_id', true));

-- Outputs scoped to project owner
DROP POLICY IF EXISTS "Outputs scoped to project owner" ON outputs;
CREATE POLICY "Outputs scoped to project owner" ON outputs
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects
      WHERE user_id::text = current_setting('app.user_id', true)
    )
  );

-- Social connections scoped to owner
DROP POLICY IF EXISTS "Social connections scoped to owner" ON social_connections;
CREATE POLICY "Social connections scoped to owner" ON social_connections
  FOR ALL USING (user_id::text = current_setting('app.user_id', true));

-- Social publish history scoped to owner
DROP POLICY IF EXISTS "Social publications scoped to owner" ON social_publications;
CREATE POLICY "Social publications scoped to owner" ON social_publications
  FOR ALL USING (user_id::text = current_setting('app.user_id', true));
