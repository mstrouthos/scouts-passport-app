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
CREATE TABLE IF NOT EXISTS scout_requirements (
  id SERIAL PRIMARY KEY,
  n INTEGER NOT NULL,
  stage TEXT NOT NULL,
  theme_el TEXT NOT NULL DEFAULT '',
  text_el TEXT NOT NULL,
  means_el TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS scout_requirement_n_uq ON scout_requirements(n);
CREATE TABLE IF NOT EXISTS requirement_awards (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  requirement_id INTEGER NOT NULL REFERENCES scout_requirements(id),
  completed_on TEXT NOT NULL,
  awarded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS requirement_award_uq ON requirement_awards(scout_id, requirement_id);
CREATE TABLE IF NOT EXISTS venture_requirements (
  id SERIAL PRIMARY KEY,
  award TEXT NOT NULL, code TEXT NOT NULL,
  area_el TEXT NOT NULL, text_el TEXT NOT NULL,
  bullets_el TEXT, options_el TEXT,
  needs_note BOOLEAN NOT NULL DEFAULT FALSE,
  group_key TEXT, group_min INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS venture_requirement_uq ON venture_requirements(award, code);
CREATE TABLE IF NOT EXISTS venture_awards (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  requirement_id INTEGER NOT NULL REFERENCES venture_requirements(id),
  completed_on TEXT NOT NULL,
  chosen_el TEXT, note_el TEXT,
  awarded_by INTEGER, created_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS venture_award_uq ON venture_awards(scout_id, requirement_id);
CREATE TABLE IF NOT EXISTS venture_milestones (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  key TEXT NOT NULL, on_date TEXT NOT NULL, recorded_by INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS venture_milestone_uq ON venture_milestones(scout_id, key);
CREATE TABLE IF NOT EXISTS venture_logs (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  kind TEXT NOT NULL,
  dates_el TEXT NOT NULL DEFAULT '', form_el TEXT NOT NULL DEFAULT '',
  place_el TEXT NOT NULL DEFAULT '', oe_el TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS achievement_requirements (
  id SERIAL PRIMARY KEY,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id),
  idx INTEGER NOT NULL,
  text_el TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS achievement_requirement_uq ON achievement_requirements(achievement_id, idx);
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
CREATE TABLE IF NOT EXISTS event_rsvps (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  answer TEXT NOT NULL,
  note_el TEXT,
  answered_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS event_rsvp_uq ON event_rsvps(event_id, scout_id);
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
  is_bonus BOOLEAN NOT NULL DEFAULT FALSE,
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
CREATE TABLE IF NOT EXISTS challenge_reveals (
  id           SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id),
  scout_id     INTEGER NOT NULL REFERENCES scouts(id),
  revealed_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS challenge_reveal_uq ON challenge_reveals (challenge_id, scout_id);

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
CREATE TABLE IF NOT EXISTS notify_groups (
  id SERIAL PRIMARY KEY,
  name_el TEXT NOT NULL, name_en TEXT,
  emoji TEXT NOT NULL DEFAULT '🎺',
  section_id INTEGER REFERENCES sections(id),
  created_by INTEGER, created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS notify_group_members (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES notify_groups(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS notify_group_member_uq ON notify_group_members(group_id, scout_id);
CREATE TABLE IF NOT EXISTS notify_group_leaders (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES notify_groups(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  assigned_by INTEGER,
  assigned_at TEXT NOT NULL DEFAULT ''
);
CREATE UNIQUE INDEX IF NOT EXISTS notify_group_leader_uq ON notify_group_leaders(group_id, scout_id);
CREATE TABLE IF NOT EXISTS polls (
  id SERIAL PRIMARY KEY,
  question_el TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  is_multi BOOLEAN NOT NULL DEFAULT FALSE,
  closes_at TEXT,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS poll_options (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES polls(id),
  text_el TEXT NOT NULL,
  idx INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS poll_votes (
  id SERIAL PRIMARY KEY,
  poll_id INTEGER NOT NULL REFERENCES polls(id),
  option_id INTEGER NOT NULL REFERENCES poll_options(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  voted_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS poll_vote_uq ON poll_votes(poll_id, option_id, scout_id);
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  audience TEXT NOT NULL,
  section_id INTEGER REFERENCES sections(id),
  group_id INTEGER REFERENCES notify_groups(id),
  text_el TEXT NOT NULL, text_en TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  via_push BOOLEAN NOT NULL DEFAULT TRUE,
  via_sms BOOLEAN NOT NULL DEFAULT FALSE,
  to_parents BOOLEAN NOT NULL DEFAULT TRUE,
  scheduled_at TEXT,
  created_by INTEGER NOT NULL, created_at TEXT NOT NULL,
  approved_by INTEGER, sent_at TEXT
);
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL,
  data TEXT NOT NULL, uploaded_by INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS parents (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER REFERENCES scouts(id),
  section_id INTEGER NOT NULL REFERENCES sections(id),
  name TEXT NOT NULL, email TEXT, phone TEXT,
  passcode_hmac TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_by INTEGER, created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS parent_passcode_uq ON parents(passcode_hmac);
CREATE TABLE IF NOT EXISTS parent_posts (
  id SERIAL PRIMARY KEY,
  section_id INTEGER REFERENCES sections(id),
  title_el TEXT NOT NULL, body_el TEXT NOT NULL DEFAULT '',
  file_id INTEGER REFERENCES files(id),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER, created_at TEXT NOT NULL
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
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS last_login_at TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS first_login_at TEXT",
  "DELETE FROM leader_scopes WHERE scope = 'patrol'",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS patrol_role TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES notify_groups(id)",
  "ALTER TABLE info_pages ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id)",
  "DROP INDEX IF EXISTS info_slug_uq",
  "CREATE UNIQUE INDEX IF NOT EXISTS info_slug_section_uq ON info_pages (slug, COALESCE(section_id, 0))",
  "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category TEXT",
  "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS to_parents BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES parents(id)",
  "ALTER TABLE parents ADD COLUMN IF NOT EXISTS scout_id INTEGER REFERENCES scouts(id)",
  "UPDATE challenges SET points = 10 WHERE points <> 10",
  "ALTER TABLE sections ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE sections ADD COLUMN IF NOT EXISTS has_app BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE leader_scopes ADD COLUMN IF NOT EXISTS rank TEXT NOT NULL DEFAULT 'archigos'",
  "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS for_leaders BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS section_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS phone TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS id_number TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS is_chief BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS tracks_attendance BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS group_id INTEGER",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS via_push BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS via_sms BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS scheduled_at TEXT",
  "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT FALSE"
]
