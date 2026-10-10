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
CREATE TABLE IF NOT EXISTS parent_notifications (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id),
  kind TEXT NOT NULL, ref_id INTEGER,
  title TEXT NOT NULL, body TEXT NOT NULL,
  created_at TEXT NOT NULL, read_at TEXT
);
CREATE INDEX IF NOT EXISTS parent_notifications_parent_idx ON parent_notifications(parent_id, created_at);
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
CREATE TABLE IF NOT EXISTS pack_challenges (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES sections(id),
  text_el TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🌟',
  week_start TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS pack_challenge_done (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES pack_challenges(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  marked_by INTEGER,
  marked_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS pack_done_uq ON pack_challenge_done(challenge_id, scout_id);
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
CREATE TABLE IF NOT EXISTS parent_children (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES parents(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS parent_child_uq ON parent_children(parent_id, scout_id);
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
-- Το μπαρ: a reusable ordering system for a night's event. Each event keeps
-- its own menu, staff and orders, so what sold last time is still there
-- when the next event is planned.
CREATE TABLE IF NOT EXISTS bar_events (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  event_date TEXT,
  table_count INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'open',
  created_by INTEGER, created_at TEXT NOT NULL, closed_at TEXT
);
CREATE TABLE IF NOT EXISTS bar_menu_items (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  coupon_ok BOOLEAN NOT NULL DEFAULT FALSE,
  coupon_cost INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS bar_staff (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  role TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  bartender_id INTEGER REFERENCES bar_staff(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bar_staff_code_uq ON bar_staff(code);
CREATE TABLE IF NOT EXISTS bar_orders (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  number INTEGER NOT NULL,
  table_no INTEGER NOT NULL,
  waiter_id INTEGER NOT NULL REFERENCES bar_staff(id),
  bartender_id INTEGER REFERENCES bar_staff(id),
  status TEXT NOT NULL DEFAULT 'new',
  total_cents INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  paid_method TEXT,
  paid_at TEXT, paid_by INTEGER,
  card_confirmed_at TEXT, card_confirmed_by INTEGER,
  created_at TEXT NOT NULL, ready_at TEXT, delivered_at TEXT, cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS bar_orders_event_ix ON bar_orders(event_id);
CREATE TABLE IF NOT EXISTS bar_menu_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_by INTEGER, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bar_menu_template_items (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES bar_menu_templates(id),
  category TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  coupon_ok BOOLEAN NOT NULL DEFAULT FALSE,
  coupon_cost INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bar_accounts (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TEXT NOT NULL
);
-- who turned up: the door, table by table, in the batches they arrived in
CREATE TABLE IF NOT EXISTS bar_arrivals (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  table_no INTEGER NOT NULL,
  count INTEGER NOT NULL,
  kids INTEGER NOT NULL DEFAULT 0,
  method TEXT NOT NULL,
  account_id INTEGER,
  cashier_id INTEGER REFERENCES bar_staff(id),
  confirmed_at TEXT, confirmed_by INTEGER,
  created_at TEXT NOT NULL
);
-- a table asking for its waiter, from the QR page (or, one day, a button)
CREATE TABLE IF NOT EXISTS bar_calls (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES bar_events(id),
  table_no INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  handled_at TEXT, handled_by INTEGER
);
CREATE TABLE IF NOT EXISTS bar_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES bar_orders(id),
  menu_item_id INTEGER REFERENCES bar_menu_items(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  coupon_qty INTEGER NOT NULL DEFAULT 0,
  coupon_cost INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS forms (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_el TEXT NOT NULL,
  intro_el TEXT,
  thanks_el TEXT,
  thanks_title_el TEXT,
  spec TEXT NOT NULL DEFAULT '{}',
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  closes_at TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS missions (
  id SERIAL PRIMARY KEY,
  title_el TEXT NOT NULL,
  description_el TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '📸',
  points INTEGER NOT NULL DEFAULT 10,
  section_id INTEGER REFERENCES sections(id),
  opens_at TEXT NOT NULL,
  closes_at TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mission_submissions (
  id SERIAL PRIMARY KEY,
  mission_id INTEGER NOT NULL REFERENCES missions(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  file_id INTEGER NOT NULL REFERENCES files(id),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_note TEXT,
  reviewed_by INTEGER,
  reviewed_at TEXT,
  award_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS mission_submission_uq ON mission_submissions (mission_id, scout_id);
CREATE TABLE IF NOT EXISTS scout_rewards (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  reward_key TEXT NOT NULL,
  unlocked_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS scout_reward_uq ON scout_rewards (scout_id, reward_key);
CREATE TABLE IF NOT EXISTS form_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  intro_el TEXT,
  thanks_el TEXT,
  thanks_title_el TEXT,
  spec TEXT NOT NULL,
  created_by INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS form_responses (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id),
  sealed TEXT NOT NULL,
  spec TEXT NOT NULL,
  ip_hash TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS form_files (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  response_id INTEGER,
  kind TEXT NOT NULL,
  question_id TEXT,
  token TEXT UNIQUE,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data TEXT NOT NULL,
  ip_hash TEXT,
  created_by INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS content_views (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  ref_id INTEGER NOT NULL,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  first_at TEXT NOT NULL,
  last_at TEXT NOT NULL,
  from_notification_at TEXT,
  UNIQUE (kind, ref_id, scout_id)
);
CREATE TABLE IF NOT EXISTS leader_fun (
  id SERIAL PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES scouts(id),
  to_id INTEGER NOT NULL REFERENCES scouts(id),
  action TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS leader_fun_created_idx ON leader_fun(created_at);
CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  year TEXT NOT NULL,
  form_id INTEGER,
  response_id INTEGER,
  marked_by INTEGER,
  created_at TEXT NOT NULL,
  UNIQUE (scout_id, year)
);
CREATE TABLE IF NOT EXISTS fun_bag (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  item TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  UNIQUE (scout_id, item)
);
CREATE TABLE IF NOT EXISTS fun_grants (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  items TEXT NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT NOT NULL,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TEXT NOT NULL,
  UNIQUE (scout_id, reason, ref)
);
CREATE TABLE IF NOT EXISTS photo_rounds (
  id SERIAL PRIMARY KEY,
  thing TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  started_by INTEGER REFERENCES scouts(id),
  ended_at TEXT
);
CREATE TABLE IF NOT EXISTS photo_shots (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL REFERENCES photo_rounds(id),
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  created_at TEXT NOT NULL,
  ok BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT,
  place INTEGER,
  points INTEGER NOT NULL DEFAULT 0,
  file_id INTEGER,
  UNIQUE (round_id, place)
);
CREATE TABLE IF NOT EXISTS fun_gifts (
  id SERIAL PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES scouts(id),
  to_id INTEGER NOT NULL REFERENCES scouts(id),
  item TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS kim_plays (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  day TEXT NOT NULL,
  started_at TEXT NOT NULL,
  answered_at TEXT,
  correct INTEGER,
  ms INTEGER,
  picks TEXT,
  UNIQUE (scout_id, day)
);
CREATE TABLE IF NOT EXISTS shop_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  stock INTEGER,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  images TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS shop_entries (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  method TEXT,
  amount_cents INTEGER NOT NULL,
  payer TEXT,
  note TEXT,
  items TEXT,
  created_by INTEGER NOT NULL,
  created_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  voided_at TEXT,
  voided_by INTEGER,
  voided_name TEXT,
  void_reason TEXT
);
CREATE TABLE IF NOT EXISTS flag_days (
  day TEXT PRIMARY KEY,
  raised_by INTEGER,
  raised_at TEXT,
  lowered_by INTEGER,
  lowered_at TEXT
);
CREATE TABLE IF NOT EXISTS north_plays (
  id SERIAL PRIMARY KEY,
  scout_id INTEGER NOT NULL REFERENCES scouts(id),
  day TEXT NOT NULL,
  started_at TEXT NOT NULL,
  answered_at TEXT,
  heading REAL,
  error REAL,
  points INTEGER,
  ms INTEGER,
  UNIQUE (scout_id, day)
);
CREATE TABLE IF NOT EXISTS kim_challenges (
  id SERIAL PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES scouts(id),
  to_id INTEGER NOT NULL REFERENCES scouts(id),
  day TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (from_id, to_id, day)
);
CREATE TABLE IF NOT EXISTS hot_potato (
  id SERIAL PRIMARY KEY,
  started_by INTEGER NOT NULL REFERENCES scouts(id),
  holder_id INTEGER NOT NULL REFERENCES scouts(id),
  prev_id INTEGER REFERENCES scouts(id),
  got_at TEXT NOT NULL,
  deadline TEXT NOT NULL,
  warned BOOLEAN NOT NULL DEFAULT FALSE,
  passes INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  burned_id INTEGER REFERENCES scouts(id)
);
CREATE TABLE IF NOT EXISTS scout_kudos (
  id SERIAL PRIMARY KEY,
  from_id INTEGER NOT NULL REFERENCES scouts(id),
  to_id INTEGER NOT NULL REFERENCES scouts(id),
  event_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (from_id, event_key)
);
CREATE INDEX IF NOT EXISTS scout_kudos_to_idx ON scout_kudos(to_id, created_at);
CREATE TABLE IF NOT EXISTS form_invites (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES forms(id),
  parent_id INTEGER NOT NULL,
  sent_at TEXT NOT NULL,
  UNIQUE (form_id, parent_id)
);
CREATE TABLE IF NOT EXISTS form_access_log (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL,
  response_id INTEGER,
  scout_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  at TEXT NOT NULL
);
`

/* Best-effort column adds for databases created before these fields existed. */
export const MIGRATIONS = [
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS birthday TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS email TEXT",
  "INSERT INTO parent_children (parent_id, scout_id) SELECT id, scout_id FROM parents WHERE scout_id IS NOT NULL ON CONFLICT DO NOTHING",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS theme_el TEXT",
  "ALTER TABLE patrols ADD COLUMN IF NOT EXISTS chant_el TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS last_login_at TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS first_login_at TEXT",
  "ALTER TABLE parents ADD COLUMN IF NOT EXISTS last_login_at TEXT",
  "ALTER TABLE parents ADD COLUMN IF NOT EXISTS first_login_at TEXT",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS repeat TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS can_edit_self BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS avatar TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS photo_file_id INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS deleted_at TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS deleted_by INTEGER",
  "DELETE FROM leader_scopes WHERE scope = 'patrol'",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS patrol_role TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES notify_groups(id)",
  "ALTER TABLE info_pages ADD COLUMN IF NOT EXISTS section_id INTEGER REFERENCES sections(id)",
  "DROP INDEX IF EXISTS info_slug_uq",
  "CREATE UNIQUE INDEX IF NOT EXISTS info_slug_section_uq ON info_pages (slug, COALESCE(section_id, 0))",
  "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category TEXT",
  "ALTER TABLE achievements ADD COLUMN IF NOT EXISTS slug TEXT",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS to_parents BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS parents_only BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS stats TEXT",
  "ALTER TABLE announcements ADD COLUMN IF NOT EXISTS targets TEXT",
  "ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS outcome TEXT",
  "ALTER TABLE notification_log ADD COLUMN IF NOT EXISTS error TEXT",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES parents(id)",
  "ALTER TABLE parents ADD COLUMN IF NOT EXISTS scout_id INTEGER REFERENCES scouts(id)",
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
  "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE bar_menu_items ADD COLUMN IF NOT EXISTS coupon_ok BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE bar_order_items ADD COLUMN IF NOT EXISTS coupon_qty INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS bar_staff_id INTEGER REFERENCES bar_staff(id)",
  "ALTER TABLE bar_events ADD COLUMN IF NOT EXISTS layout TEXT",
  "ALTER TABLE bar_staff ADD COLUMN IF NOT EXISTS accepts TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE bar_orders ADD COLUMN IF NOT EXISTS account_id INTEGER",
  "ALTER TABLE bar_menu_items ADD COLUMN IF NOT EXISTS coupon_cost INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE bar_menu_template_items ADD COLUMN IF NOT EXISTS coupon_cost INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE bar_order_items ADD COLUMN IF NOT EXISTS coupon_cost INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE bar_events ADD COLUMN IF NOT EXISTS entrance_cents INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE bar_arrivals ADD COLUMN IF NOT EXISTS confirmed_at TEXT",
  "ALTER TABLE bar_arrivals ADD COLUMN IF NOT EXISTS confirmed_by INTEGER",
  "ALTER TABLE bar_arrivals ADD COLUMN IF NOT EXISTS kids INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE bar_events ADD COLUMN IF NOT EXISTS coupons_per_adult INTEGER NOT NULL DEFAULT 1",
  "ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS surfaces TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE info_pages ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE info_pages ADD COLUMN IF NOT EXISTS created_by INTEGER",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS thanks_title_el TEXT",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS section_id INTEGER",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS approved_by INTEGER",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS approved_at TEXT",
  "ALTER TABLE form_responses ADD COLUMN IF NOT EXISTS parent_id INTEGER",
  "ALTER TABLE form_invites ADD COLUMN IF NOT EXISTS reminded_at TEXT",
  "ALTER TABLE challenges ADD COLUMN IF NOT EXISTS min_points INTEGER NOT NULL DEFAULT 5",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS moments_seen_at TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS last_rank INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS last_patrol_rank INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS birthday_seen TEXT",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS parent_sections TEXT",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS parents_set_at TEXT",
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS parents_notified_at TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS extra_section_ids TEXT",
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS with_leaders BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dismissed_at TEXT",
  "ALTER TABLE parent_notifications ADD COLUMN IF NOT EXISTS dismissed_at TEXT",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS fun_pref TEXT NOT NULL DEFAULT 'all'",
  // the playground's "who did it?": a throw without a name, guessed at
  "ALTER TABLE leader_fun ADD COLUMN IF NOT EXISTS anon BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE leader_fun ADD COLUMN IF NOT EXISTS guesses INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE leader_fun ADD COLUMN IF NOT EXISTS outcome TEXT",
  // done by the game itself (a throw-back, a potato passed): not counted in the day's ten
  "ALTER TABLE leader_fun ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT FALSE",
  // the potato's round: who has held it since everyone last had a turn
  "ALTER TABLE hot_potato ADD COLUMN IF NOT EXISTS cycle TEXT",
  // what the one it bursts on must do, and who ended a round early
  "ALTER TABLE hot_potato ADD COLUMN IF NOT EXISTS challenge TEXT",
  "ALTER TABLE hot_potato ADD COLUMN IF NOT EXISTS stopped_by INTEGER",
  // the form that registers members for a scout year ("2026-27"), if it is one
  "ALTER TABLE forms ADD COLUMN IF NOT EXISTS registration_year TEXT",
  // linked by the name a parent typed (a form sent by plain link), for a leader to check
  "ALTER TABLE registrations ADD COLUMN IF NOT EXISTS auto BOOLEAN NOT NULL DEFAULT FALSE",
  // when a Βαθμοφόρος first saw the hot potato video (shown with their first new round)
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS potato_video_seen TEXT",
  // left out by the Αρχηγός Συστήματος of the games that need others to take part (the potato, Kim's dares)
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS games_excluded BOOLEAN NOT NULL DEFAULT FALSE",
  // who was playing the potato when a round burst (JSON ids): each of them but the one it burst on scores
  "ALTER TABLE hot_potato ADD COLUMN IF NOT EXISTS players TEXT",
  // the shop: who runs it (set by the Αρχηγός Συστήματος)
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS shop_manager BOOLEAN NOT NULL DEFAULT FALSE",
  // the till's lines name who wrote and who cancelled them
  "ALTER TABLE shop_entries ADD COLUMN IF NOT EXISTS created_name TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE shop_entries ADD COLUMN IF NOT EXISTS voided_name TEXT",
  // an item's pictures (JSON file ids, the first one its cover)
  "ALTER TABLE shop_items ADD COLUMN IF NOT EXISTS images TEXT",
  // the mini-games' news off the phone: by choice, or by the Αρχηγός Συστήματος
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS game_notifs_off BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS game_notifs_blocked BOOLEAN NOT NULL DEFAULT FALSE",
  // the photo game: who may play it while it is being tried out (the Αρχηγός Συστήματος chooses)
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS photo_game BOOLEAN NOT NULL DEFAULT FALSE",
  // when the photo game's video was first seen: until then it opens by itself
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS photo_video_seen TEXT",
  // a photo sent once the three places were taken: kept to show, not judged
  "ALTER TABLE photo_shots ADD COLUMN IF NOT EXISTS judged BOOLEAN NOT NULL DEFAULT TRUE",
  // who left a Βαθμοφόρος out of the games / kept their news off the phone (shown to them)
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS games_excluded_by INTEGER",
  "ALTER TABLE scouts ADD COLUMN IF NOT EXISTS game_notifs_blocked_by INTEGER"
]
