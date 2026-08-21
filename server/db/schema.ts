import { pgTable, text, integer, serial, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core'

export const sections = pgTable('sections', {
  id: serial('id').primaryKey(),
  nameEl: text('name_el').notNull(),
  nameEn: text('name_en'),
  sortOrder: integer('sort_order').notNull().default(0),
  slug: text('slug'),
  hasApp: boolean('has_app').notNull().default(true)
})

export const patrols = pgTable('patrols', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => sections.id),
  nameEl: text('name_el').notNull(),
  nameEn: text('name_en'),
  emblem: text('emblem').notNull().default('⚜️'),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const scouts = pgTable('scouts', {
  id: serial('id').primaryKey(),
  patrolId: integer('patrol_id').references(() => patrols.id),
  sectionId: integer('section_id').references(() => sections.id),
  firstName: text('first_name').notNull(),
  phone: text('phone'),
  idNumber: text('id_number'),
  lastName: text('last_name').notNull(),
  firstNameEn: text('first_name_en'),
  lastNameEn: text('last_name_en'),
  passcodeHmac: text('passcode_hmac').notNull(),
  role: text('role', { enum: ['scout', 'leader', 'troop_leader'] }).notNull().default('scout'),
  // Full access ('troop_leader') can be granted to several people, but only one
  // of them actually holds the office of Αρχηγός Συστήματος — the rest are
  // administrators. This flag is what tells the two apart in the UI.
  isChief: boolean('is_chief').notNull().default(false),
  locale: text('locale').notNull().default('el'),
  isActive: boolean('is_active').notNull().default(true),
  joinedOn: text('joined_on'),
  createdAt: text('created_at').notNull().default('')
}, t => [uniqueIndex('scouts_passcode_uq').on(t.passcodeHmac)])

export const leaderScopes = pgTable('leader_scopes', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  scope: text('scope', { enum: ['troop', 'section', 'patrol'] }).notNull(),
  sectionId: integer('section_id').references(() => sections.id),
  patrolId: integer('patrol_id').references(() => patrols.id),
  rank: text('rank', { enum: ['archigos', 'yparchigos'] }).notNull().default('archigos'),
  assignedBy: integer('assigned_by'),
  assignedAt: text('assigned_at')
})

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  titleEl: text('title_el').notNull(),
  titleEn: text('title_en'),
  descriptionEl: text('description_el').notNull().default(''),
  descriptionEn: text('description_en'),
  iconEmoji: text('icon_emoji').notNull().default('🏅'),
  points: integer('points').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
  isArchived: boolean('is_archived').notNull().default(false)
})

export const scoutAchievements = pgTable('scout_achievements', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  achievementId: integer('achievement_id').notNull().references(() => achievements.id),
  completedOn: text('completed_on').notNull(),
  awardedBy: integer('awarded_by'),
  noteEl: text('note_el'),
  noteEn: text('note_en')
}, t => [uniqueIndex('scout_achievement_uq').on(t.scoutId, t.achievementId)])

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  scope: text('scope', { enum: ['troop', 'section', 'patrol'] }).notNull(),
  sectionId: integer('section_id').references(() => sections.id),
  patrolId: integer('patrol_id').references(() => patrols.id),
  titleEl: text('title_el').notNull(),
  titleEn: text('title_en'),
  descriptionEl: text('description_el'),
  descriptionEn: text('description_en'),
  location: text('location'),
  startsAt: text('starts_at').notNull(),
  endsAt: text('ends_at'),
  isAllDay: boolean('is_all_day').notNull().default(false),
  // some events (a parade, a parents' meeting) are not scored at all
  tracksAttendance: boolean('tracks_attendance').notNull().default(true),
  remindAt: text('remind_at'),
  createdBy: integer('created_by')
})

/** Small key/value store for troop-wide settings (attendance point values, …). */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

export const eventReviews = pgTable('event_reviews', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull().references(() => events.id),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  attendance: text('attendance', { enum: ['present', 'absent', 'excused'] }),
  uniform: text('uniform', { enum: ['full', 'partial', 'none'] }),
  recordedBy: integer('recorded_by'),
  recordedAt: text('recorded_at')
}, t => [uniqueIndex('event_review_uq').on(t.eventId, t.scoutId)])

export const pointAwards = pgTable('point_awards', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').references(() => scouts.id),
  patrolId: integer('patrol_id').references(() => patrols.id),
  eventId: integer('event_id').references(() => events.id),
  kind: text('kind', { enum: ['game', 'attendance', 'uniform', 'manual'] }).notNull(),
  points: integer('points').notNull(),
  reasonEl: text('reason_el').notNull().default(''),
  reasonEn: text('reason_en'),
  awardedBy: integer('awarded_by'),
  awardedAt: text('awarded_at').notNull()
})

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  titleEl: text('title_el').notNull(),
  titleEn: text('title_en'),
  questionEl: text('question_el').notNull(),
  questionEn: text('question_en'),
  imageEmoji: text('image_emoji'),
  explanationEl: text('explanation_el').notNull().default(''),
  explanationEn: text('explanation_en'),
  points: integer('points').notNull().default(10),
  unlocksAt: text('unlocks_at'),
  closesAt: text('closes_at'),
  sectionId: integer('section_id').references(() => sections.id),
  patrolId: integer('patrol_id').references(() => patrols.id),
  createdBy: integer('created_by'),
  isPublished: boolean('is_published').notNull().default(false),
  forLeaders: boolean('for_leaders').notNull().default(false),
  notifiedAt: text('notified_at')
})

export const challengeOptions = pgTable('challenge_options', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  textEl: text('text_el').notNull(),
  textEn: text('text_en'),
  isCorrect: boolean('is_correct').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(0)
})

export const challengeAnswers = pgTable('challenge_answers', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  optionId: integer('option_id').notNull().references(() => challengeOptions.id),
  isCorrect: boolean('is_correct').notNull(),
  pointsAwarded: integer('points_awarded').notNull(),
  answeredAt: text('answered_at').notNull()
}, t => [uniqueIndex('challenge_answer_uq').on(t.challengeId, t.scoutId)])

export const infoPages = pgTable('info_pages', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull(),
  iconEmoji: text('icon_emoji').notNull().default('ℹ️'),
  titleEl: text('title_el').notNull(),
  titleEn: text('title_en'),
  summaryEl: text('summary_el').notNull().default(''),
  summaryEn: text('summary_en'),
  bodyEl: text('body_el').notNull().default(''),
  bodyEn: text('body_en'),
  illustration: text('illustration'),
  sortOrder: integer('sort_order').notNull().default(0),
  isPublished: boolean('is_published').notNull().default(false)
}, t => [uniqueIndex('info_slug_uq').on(t.slug)])

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').references(() => scouts.id),
  sectionId: integer('section_id').references(() => sections.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('push_endpoint_uq').on(t.endpoint)])

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  audience: text('audience', { enum: ['troop', 'section', 'leaders'] }).notNull(),
  sectionId: integer('section_id').references(() => sections.id),
  textEl: text('text_el').notNull(),
  textEn: text('text_en'),
  status: text('status', { enum: ['pending', 'sent'] }).notNull().default('pending'),
  createdBy: integer('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  approvedBy: integer('approved_by'),
  sentAt: text('sent_at')
})

export const familyContacts = pgTable('family_contacts', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').notNull().references(() => sections.id),
  email: text('email').notNull(),
  addedBy: integer('added_by'),
  createdAt: text('created_at')
}, t => [uniqueIndex('family_contact_uq').on(t.sectionId, t.email)])

export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  kind: text('kind').notNull(),
  refId: integer('ref_id'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: text('created_at').notNull(),
  readAt: text('read_at')
})

export const notificationLog = pgTable('notification_log', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').notNull(),
  kind: text('kind').notNull(),
  refId: integer('ref_id'),
  sentAt: text('sent_at').notNull()
}, t => [uniqueIndex('notification_uq').on(t.scoutId, t.kind, t.refId)])
