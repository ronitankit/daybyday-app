-- DayByDay: Initial Schema Migration
-- Enables UUID generation and sets up all tables with RLS

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE habit_type AS ENUM ('binary', 'quantity', 'duration', 'limit');
CREATE TYPE schedule_type AS ENUM ('daily', 'weekdays', 'weekly_frequency', 'weekly_cumulative');
CREATE TYPE habit_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE outcome_state AS ENUM ('completed', 'partial', 'missed', 'skipped', 'excused_skip');
CREATE TYPE success_direction AS ENUM ('increase', 'decrease', 'zero');
CREATE TYPE sync_status AS ENUM ('pending', 'synced', 'conflict', 'failed');

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  timezone      TEXT NOT NULL DEFAULT 'UTC',
  week_start    SMALLINT NOT NULL DEFAULT 1 CHECK (week_start BETWEEN 0 AND 6), -- 0=Sun, 1=Mon
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER PREFERENCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_preferences (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  theme                 TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notification_enabled  BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_start     TIME,
  quiet_hours_end       TIME,
  end_of_day_reminder   BOOLEAN NOT NULL DEFAULT false,
  end_of_day_time       TIME,
  default_week_start    SMALLINT NOT NULL DEFAULT 1,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CATEGORIES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  colour      TEXT NOT NULL DEFAULT '#6366f1',
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  archived    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ROUTINES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE routines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  colour      TEXT NOT NULL DEFAULT '#8b5cf6',
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  archived    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABITS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habits (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  habit_type        habit_type NOT NULL,
  target_value      NUMERIC,
  unit              TEXT,
  success_direction success_direction NOT NULL DEFAULT 'increase',
  category_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
  routine_id        UUID REFERENCES routines(id) ON DELETE SET NULL,
  colour            TEXT NOT NULL DEFAULT '#6366f1',
  icon              TEXT,
  start_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date          DATE,
  status            habit_status NOT NULL DEFAULT 'active',
  sort_order        INTEGER NOT NULL DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_target CHECK (target_value IS NULL OR target_value > 0),
  CONSTRAINT valid_limit_type CHECK (
    habit_type != 'limit' OR (target_value IS NOT NULL AND success_direction IN ('decrease', 'zero'))
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABIT SCHEDULES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habit_schedules (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id            UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_type       schedule_type NOT NULL,
  -- For weekdays: array of ISO weekday numbers (1=Mon..7=Sun)
  weekdays            SMALLINT[],
  -- For weekly_frequency: target number of completions per week
  frequency_target    SMALLINT,
  -- For weekly_cumulative: target cumulative value per week
  cumulative_target   NUMERIC,
  effective_from      DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until     DATE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_weekdays CHECK (
    schedule_type != 'weekdays' OR (weekdays IS NOT NULL AND array_length(weekdays, 1) > 0)
  ),
  CONSTRAINT valid_frequency CHECK (
    schedule_type != 'weekly_frequency' OR (frequency_target IS NOT NULL AND frequency_target > 0)
  ),
  CONSTRAINT valid_cumulative CHECK (
    schedule_type != 'weekly_cumulative' OR (cumulative_target IS NOT NULL AND cumulative_target > 0)
  )
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABIT QUICK INCREMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habit_quick_increments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id    UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value       NUMERIC NOT NULL CHECK (value > 0),
  label       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABIT LOGS (daily aggregate per habit)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habit_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date        DATE NOT NULL,
  outcome         outcome_state,
  total_value     NUMERIC NOT NULL DEFAULT 0,
  note            TEXT,
  skip_reason     TEXT,
  skipped_at      TIMESTAMPTZ,
  is_excused      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABIT LOG EVENTS (individual progress entries)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habit_log_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  log_id          UUID NOT NULL REFERENCES habit_logs(id) ON DELETE CASCADE,
  habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value           NUMERIC NOT NULL DEFAULT 0,
  note            TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SKIP REASONS (lookup table)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE skip_reasons (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  is_excused  BOOLEAN NOT NULL DEFAULT false,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- HABIT REMINDERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE habit_reminders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id        UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  remind_time     TIME NOT NULL,
  only_incomplete BOOLEAN NOT NULL DEFAULT false,
  enabled         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACHIEVEMENTS (definitions)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE achievements (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT 'trophy',
  category    TEXT NOT NULL DEFAULT 'general',
  threshold   NUMERIC,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER ACHIEVEMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  habit_id        UUID REFERENCES habits(id) ON DELETE SET NULL,
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id, habit_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GUEST MIGRATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE guest_migrations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  migration_id    TEXT NOT NULL UNIQUE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  habit_count     INTEGER NOT NULL DEFAULT 0,
  log_count       INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_status ON habits(user_id, status);
CREATE INDEX idx_habits_category ON habits(user_id, category_id);
CREATE INDEX idx_habits_routine ON habits(user_id, routine_id);
CREATE INDEX idx_habit_logs_user_date ON habit_logs(user_id, log_date DESC);
CREATE INDEX idx_habit_logs_habit_date ON habit_logs(habit_id, log_date DESC);
CREATE INDEX idx_habit_log_events_log ON habit_log_events(log_id);
CREATE INDEX idx_habit_log_events_habit ON habit_log_events(habit_id, recorded_at DESC);
CREATE INDEX idx_habit_schedules_habit ON habit_schedules(habit_id);
CREATE INDEX idx_habit_reminders_habit ON habit_reminders(habit_id);
CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_categories_user ON categories(user_id);
CREATE INDEX idx_routines_user ON routines(user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_routines_updated_at BEFORE UPDATE ON routines FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_habit_schedules_updated_at BEFORE UPDATE ON habit_schedules FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_habit_logs_updated_at BEFORE UPDATE ON habit_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_habit_log_events_updated_at BEFORE UPDATE ON habit_log_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILE AUTO-CREATE ON SIGN UP
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );

  INSERT INTO user_preferences (user_id) VALUES (NEW.id);

  -- Seed default categories
  INSERT INTO categories (user_id, name, colour, icon, sort_order, is_default) VALUES
    (NEW.id, 'Health',       '#22c55e', 'heart',          0, true),
    (NEW.id, 'Fitness',      '#f97316', 'dumbbell',       1, true),
    (NEW.id, 'Learning',     '#3b82f6', 'book-open',      2, true),
    (NEW.id, 'Productivity', '#6366f1', 'zap',            3, true),
    (NEW.id, 'Mindfulness',  '#8b5cf6', 'brain',          4, true),
    (NEW.id, 'Finance',      '#eab308', 'piggy-bank',     5, true),
    (NEW.id, 'Personal',     '#ec4899', 'user',           6, true),
    (NEW.id, 'Other',        '#94a3b8', 'circle',         7, true);

  -- Seed default skip reasons
  INSERT INTO skip_reasons (user_id, label, is_excused, is_default, sort_order) VALUES
    (NEW.id, 'Illness',             true,  true, 0),
    (NEW.id, 'Travel',              true,  true, 1),
    (NEW.id, 'Rest day',            true,  true, 2),
    (NEW.id, 'Work commitment',     false, true, 3),
    (NEW.id, 'Personal commitment', false, true, 4),
    (NEW.id, 'Other',               false, true, 5);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories            ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines              ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_quick_increments ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_log_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE skip_reasons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_reminders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements     ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_migrations      ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see and update their own profile
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User preferences
CREATE POLICY "prefs_select_own" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "prefs_delete_own" ON user_preferences FOR DELETE USING (auth.uid() = user_id);

-- Categories
CREATE POLICY "categories_select_own" ON categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories FOR DELETE USING (auth.uid() = user_id);

-- Routines
CREATE POLICY "routines_select_own" ON routines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "routines_insert_own" ON routines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "routines_update_own" ON routines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "routines_delete_own" ON routines FOR DELETE USING (auth.uid() = user_id);

-- Habits
CREATE POLICY "habits_select_own" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "habits_insert_own" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "habits_update_own" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "habits_delete_own" ON habits FOR DELETE USING (auth.uid() = user_id);

-- Habit schedules
CREATE POLICY "schedules_select_own" ON habit_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "schedules_insert_own" ON habit_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "schedules_update_own" ON habit_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "schedules_delete_own" ON habit_schedules FOR DELETE USING (auth.uid() = user_id);

-- Quick increments
CREATE POLICY "increments_select_own" ON habit_quick_increments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "increments_insert_own" ON habit_quick_increments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "increments_update_own" ON habit_quick_increments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "increments_delete_own" ON habit_quick_increments FOR DELETE USING (auth.uid() = user_id);

-- Habit logs
CREATE POLICY "logs_select_own" ON habit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "logs_insert_own" ON habit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "logs_update_own" ON habit_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "logs_delete_own" ON habit_logs FOR DELETE USING (auth.uid() = user_id);

-- Habit log events
CREATE POLICY "log_events_select_own" ON habit_log_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "log_events_insert_own" ON habit_log_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "log_events_update_own" ON habit_log_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "log_events_delete_own" ON habit_log_events FOR DELETE USING (auth.uid() = user_id);

-- Skip reasons
CREATE POLICY "skip_reasons_select_own" ON skip_reasons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "skip_reasons_insert_own" ON skip_reasons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "skip_reasons_update_own" ON skip_reasons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "skip_reasons_delete_own" ON skip_reasons FOR DELETE USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "reminders_select_own" ON habit_reminders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reminders_insert_own" ON habit_reminders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reminders_update_own" ON habit_reminders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reminders_delete_own" ON habit_reminders FOR DELETE USING (auth.uid() = user_id);

-- Achievements: publicly readable
CREATE POLICY "achievements_select_all" ON achievements FOR SELECT USING (true);

-- User achievements
CREATE POLICY "user_achievements_select_own" ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_insert_own" ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_achievements_delete_own" ON user_achievements FOR DELETE USING (auth.uid() = user_id);

-- Guest migrations
CREATE POLICY "migrations_select_own" ON guest_migrations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "migrations_insert_own" ON guest_migrations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "migrations_update_own" ON guest_migrations FOR UPDATE USING (auth.uid() = user_id);
