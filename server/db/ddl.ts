// Executed with CREATE TABLE IF NOT EXISTS on boot — the single source of DDL.
export const DDL = `
CREATE TABLE IF NOT EXISTS sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_el TEXT NOT NULL, name_en TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  slug TEXT, has_app INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS patrols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  name_el TEXT NOT NULL, name_en TEXT,
  emblem TEXT NOT NULL DEFAULT '⚜️', sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patrol_id INTEGER REFERENCES patrols(id),
  first_name TEXT NOT NULL, last_name TEXT NOT NULL,
  first_name_en TEXT, last_name_en TEXT,
  section_id INTEGER REFERENCES sections(id),
  passcode_hmac TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'scout',
  locale TEXT NOT NULL DEFAULT 'el',
  is_active INTEGER NOT NULL DEFAULT 1,
  joined_on TEXT, created_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS scouts_passcode_uq ON scouts(passcode_hmac);
CREATE TABLE IF NOT EXISTS leader_scopes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  scope TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  rank TEXT NOT NULL DEFAULT 'archigos',
  assigned_by INTEGER, assigned_at TEXT
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_el TEXT NOT NULL, title_en TEXT,
  description_el TEXT NOT NULL DEFAULT '', description_en TEXT,
  icon_emoji TEXT NOT NULL DEFAULT '🏅',
  points INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS scout_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  completed_on TEXT NOT NULL, awarded_by INTEGER, note_el TEXT, note_en TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS scout_achievement_uq ON scout_achievements(scout_id, achievement_id);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  title_el TEXT NOT NULL, title_en TEXT,
  description_el TEXT, description_en TEXT,
  location TEXT, starts_at TEXT NOT NULL, ends_at TEXT,
  is_all_day INTEGER NOT NULL DEFAULT 0,
  remind_at TEXT, created_by INTEGER
);
CREATE TABLE IF NOT EXISTS event_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  attendance TEXT, uniform TEXT, recorded_by INTEGER, recorded_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS event_review_uq ON event_reviews(event_id, scout_id);
CREATE TABLE IF NOT EXISTS point_awards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER REFERENCES scouts(id),
  patrol_id INTEGER REFERENCES patrols(id),
  event_id INTEGER REFERENCES events(id),
  kind TEXT NOT NULL, points INTEGER NOT NULL,
  reason_el TEXT NOT NULL DEFAULT '', reason_en TEXT,
  awarded_by INTEGER, awarded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_el TEXT NOT NULL, title_en TEXT,
  question_el TEXT NOT NULL, question_en TEXT,
  image_emoji TEXT,
  explanation_el TEXT NOT NULL DEFAULT '', explanation_en TEXT,
  points INTEGER NOT NULL DEFAULT 10,
  unlocks_at TEXT, closes_at TEXT,
  section_id INTEGER REFERENCES sections(id),
  patrol_id INTEGER REFERENCES patrols(id),
  created_by INTEGER,
  is_published INTEGER NOT NULL DEFAULT 0,
  for_leaders INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT
);
CREATE TABLE IF NOT EXISTS challenge_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  text_el TEXT NOT NULL, text_en TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS challenge_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  option_id INTEGER NOT NULL REFERENCES challenge_options(id),
  is_correct INTEGER NOT NULL,
  points_awarded INTEGER NOT NULL,
  answered_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS challenge_answer_uq ON challenge_answers(challenge_id, scout_id);
CREATE TABLE IF NOT EXISTS info_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT 'ℹ️',
  title_el TEXT NOT NULL, title_en TEXT,
  summary_el TEXT NOT NULL DEFAULT '', summary_en TEXT,
  body_el TEXT NOT NULL DEFAULT '', body_en TEXT,
  illustration TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS info_slug_uq ON info_pages(slug);
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER REFERENCES scouts(id),
  section_id INTEGER REFERENCES sections(id),
  endpoint TEXT NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL,
  user_agent TEXT, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS push_endpoint_uq ON push_subscriptions(endpoint);
CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER NOT NULL, kind TEXT NOT NULL, ref_id INTEGER,
  sent_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS notification_uq ON notification_log(scout_id, kind, ref_id);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  kind TEXT NOT NULL, ref_id INTEGER,
  title TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS notifications_scout_idx ON notifications(scout_id, created_at);
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  audience TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  text_el TEXT NOT NULL, text_en TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER NOT NULL, created_at TEXT NOT NULL,
  approved_by INTEGER, sent_at TEXT
);
CREATE TABLE IF NOT EXISTS family_contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  email TEXT NOT NULL,
  added_by INTEGER, created_at TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS family_contact_uq ON family_contacts(section_id, email);
`

/* Best-effort column adds for databases created before these fields existed. */
export const MIGRATIONS = [
  "ALTER TABLE sections ADD COLUMN slug TEXT",
  "ALTER TABLE sections ADD COLUMN has_app INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE leader_scopes ADD COLUMN rank TEXT NOT NULL DEFAULT 'archigos'",
  "ALTER TABLE challenges ADD COLUMN for_leaders INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE push_subscriptions ADD COLUMN section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN phone TEXT",
  "ALTER TABLE scouts ADD COLUMN id_number TEXT"
]
