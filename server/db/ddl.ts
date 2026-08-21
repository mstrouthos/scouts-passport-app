// Executed with CREATE TABLE IF NOT EXISTS on boot — the single source of DDL.
export const DDL = `
CREATE TABLE IF NOT EXISTS sections (
  id SERIAL PRIMARY KEY,
  name_el TEXT NOT NULL, name_en TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  slug TEXT, has_app BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS patrols (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  name_el TEXT NOT NULL, name_en TEXT,
  emblem TEXT NOT NULL DEFAULT '⚜️', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scouts (
  id SERIAL PRIMARY KEY,
  patrol_id INTEGER REFERENCES patrols(id),
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  first_name_en TEXT, last_name_en TEXT,
  section_id INTEGER REFERENCES sections(id),
  passcode_hmac TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'scout',
  is_chief BOOLEAN NOT NULL DEFAULT FALSE,
  locale TEXT NOT NULL DEFAULT 'el',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  joined_on TEXT, created_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS scouts_passcode_uq ON scouts(passcode_hmac);
CREATE TABLE IF NOT EXISTS leader_scopes (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  scope TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  rank TEXT NOT NULL DEFAULT 'archigos',
  assigned_by INTEGER, assigned_at TEXT
);
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  title_el TEXT NOT NULL, title_en TEXT,
  description_el TEXT NOT NULL DEFAULT '', description_en TEXT,
  icon_emoji TEXT NOT NULL DEFAULT '🏅',
  points INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS scout_achievements (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  completed_on TEXT NOT NULL, awarded_by INTEGER, note_el TEXT, note_en TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS scout_achievement_uq ON scout_achievements(scout_id, achievement_id);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  scope TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  title_el TEXT NOT NULL, title_en TEXT,
  description_el TEXT, description_en TEXT,
  location TEXT, starts_at TEXT NOT NULL, ends_at TEXT,
  is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
  tracks_attendance BOOLEAN NOT NULL DEFAULT TRUE,
  remind_at TEXT, created_by INTEGER
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_reviews (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  attendance TEXT, uniform TEXT, recorded_by INTEGER, recorded_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS event_review_uq ON event_reviews(event_id, scout_id);
CREATE TABLE IF NOT EXISTS point_awards (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER REFERENCES scouts(id),
  patrol_id INTEGER REFERENCES patrols(id),
  event_id INTEGER REFERENCES events(id),
  kind TEXT NOT NULL, points INTEGER NOT NULL,
  reason_el TEXT NOT NULL DEFAULT '', reason_en TEXT,
  awarded_by INTEGER, awarded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  title_el TEXT NOT NULL, title_en TEXT,
  question_el TEXT NOT NULL, question_en TEXT,
  image_emoji TEXT,
  explanation_el TEXT NOT NULL DEFAULT '', explanation_en TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  unlocks_at TEXT, closes_at TEXT,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  created_by INTEGER,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  for_leaders BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at TEXT
);
CREATE TABLE IF NOT EXISTS challenge_options (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  text_el TEXT NOT NULL, text_en TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS challenge_answers (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  option_id INTEGER NOT NULL REFERENCES challenge_options(id),
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL,
  answered_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS challenge_answer_uq ON challenge_answers(challenge_id, scout_id);
CREATE TABLE IF NOT EXISTS info_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT 'ℹ️',
  title_el TEXT NOT NULL, title_en TEXT,
  summary_el TEXT NOT NULL DEFAULT '', summary_en TEXT,
  body_el TEXT NOT NULL DEFAULT '', body_en TEXT,
  illustration TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE UNIQUE INDEX IF NOT EXISTS info_slug_uq ON info_pages(slug);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER REFERENCES scouts(id),
  section_id INTEGER REFERENCES sections(id),
  endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  user_agent TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS push_endpoint_uq ON push_subscriptions(endpoint);
CREATE TABLE IF NOT EXISTS notification_log (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL, kind TEXT NOT NULL, ref_id INTEGER,
  sent_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS notification_uq ON notification_log(scout_id, kind, ref_id);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  kind TEXT NOT NULL, ref_id INTEGER,
  title TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS notifications_scout_idx ON notifications(scout_id, created_at);
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  audience TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  text_el TEXT NOT NULL, text_en TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER NOT NULL, created_at TEXT NOT NULL,
  approved_by INTEGER, sent_at TEXT
);
CREATE TABLE IF NOT EXISTS family_contacts (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  email TEXT NOT NULL,
  added_by INTEGER, created_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS family_contact_uq ON family_contacts(section_id, email);
`

/* Best-effort column adds for databases created before these fields existed. */
export const MIGRATIONS = [
  "ALTER TABLE sections ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE sections ADD COLUMN IF NOT EXISTS has_app BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE leader_scopes ADD COLUMN IF NOT EXISTS rank TEXT NOT NULL DEFAULT 'archigos'",
  "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS for_leaders BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS phone TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS id_number TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS is_chief BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS tracks_attendance BOOLEAN NOT NULL DEFAULT TRUE"
]
