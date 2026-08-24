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
  // slug ties a badge to the passport catalogue so reseeding updates in place
  slug: text('slug'),
  category: text('category'),
  isArchived: boolean('is_archived').notNull().default(false)
})

/** One requirement from the Προσκοπικό Διαβατήριο (pages 5–19). The catalogue
    is fixed by the national programme, so it is seeded, never user-edited. */
export const scoutRequirements = pgTable('scout_requirements', {
  id: serial('id').primaryKey(),
  n: integer('n').notNull(),                       // the number printed in the passport
  stage: text('stage').notNull(),                  // arxarios | xalkino | argyro | xryso
  themeEl: text('theme_el').notNull().default(''), // θεματική ενότητα
  textEl: text('text_el').notNull(),
  meansEl: text('means_el').notNull().default(''), // προτεινόμενοι τρόποι επίτευξης
  level: text('level').notNull().default('')
}, t => [uniqueIndex('scout_requirement_n_uq').on(t.n)])

/** A requirement signed off for one scout — the app's version of the Αρχηγός
    signing and dating the passport. */
export const requirementAwards = pgTable('requirement_awards', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  requirementId: integer('requirement_id').notNull().references(() => scoutRequirements.id),
  completedOn: text('completed_on').notNull(),
  awardedBy: integer('awarded_by'),
  createdAt: text('created_at').notNull().default('')
}, t => [uniqueIndex('requirement_award_uq').on(t.scoutId, t.requirementId)])

/** What a Πτυχίο asks for (pages 21–48), in the order the passport lists it. */
export const achievementRequirements = pgTable('achievement_requirements', {
  id: serial('id').primaryKey(),
  achievementId: integer('achievement_id').notNull().references(() => achievements.id),
  idx: integer('idx').notNull(),
  textEl: text('text_el').notNull()
}, t => [uniqueIndex('achievement_requirement_uq').on(t.achievementId, t.idx)])

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
  // bonus questions are only offered to scouts who kept a full Mon-Sun streak
  isBonus: boolean('is_bonus').notNull().default(false),
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

/** When a scout asked to see a question's options. The answer clock runs from
    here, server-side, so the countdown cannot be reset by reloading the page. */
export const challengeReveals = pgTable('challenge_reveals', {
  id: serial('id').primaryKey(),
  challengeId: integer('challenge_id').notNull().references(() => challenges.id),
  scoutId: integer('scout_id').notNull().references(() => scouts.id),
  revealedAt: text('revealed_at').notNull()
}, t => [uniqueIndex('challenge_reveal_uq').on(t.challengeId, t.scoutId)])

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
  parentId: integer('parent_id').references(() => parents.id),
  sectionId: integer('section_id').references(() => sections.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('push_endpoint_uq').on(t.endpoint)])

/** A named list of people to notify together — e.g. η μπάντα, who need a
    reminder before a performance regardless of which section they are in. */
export const notifyGroups = pgTable('notify_groups', {
  id: serial('id').primaryKey(),
  nameEl: text('name_el').notNull(),
  nameEn: text('name_en'),
  emoji: text('emoji').notNull().default('🎺'),
  // null = the group spans the whole troop; otherwise it belongs to one section
  sectionId: integer('section_id').references(() => sections.id),
  createdBy: integer('created_by'),
  createdAt: text('created_at').notNull().default('')
})

export const notifyGroupMembers = pgTable('notify_group_members', {
  id: serial('id').primaryKey(),
  groupId: integer('group_id').notNull().references(() => notifyGroups.id),
  scoutId: integer('scout_id').notNull().references(() => scouts.id)
}, t => [uniqueIndex('notify_group_member_uq').on(t.groupId, t.scoutId)])

export const announcements = pgTable('announcements', {
  id: serial('id').primaryKey(),
  audience: text('audience', { enum: ['troop', 'section', 'leaders', 'group'] }).notNull(),
  sectionId: integer('section_id').references(() => sections.id),
  groupId: integer('group_id').references(() => notifyGroups.id),
  textEl: text('text_el').notNull(),
  textEn: text('text_en'),
  status: text('status', { enum: ['pending', 'scheduled', 'sent'] }).notNull().default('pending'),
  // which channels the sender chose — push always, SMS only when asked
  viaPush: boolean('via_push').notNull().default(true),
  viaSms: boolean('via_sms').notNull().default(false),
  // whether the parents of the recipients hear about it too
  toParents: boolean('to_parents').notNull().default(true),
  scheduledAt: text('scheduled_at'),
  createdBy: integer('created_by').notNull(),
  createdAt: text('created_at').notNull(),
  approvedBy: integer('approved_by'),
  sentAt: text('sent_at')
})

/** Uploaded files (parent announcements as PDF). Stored IN the database on
    purpose: the app container is stateless, so anything written to its disk
    disappears on the next deploy. */
export const files = pgTable('files', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  mime: text('mime').notNull(),
  size: integer('size').notNull(),
  data: text('data').notNull(),          // base64
  uploadedBy: integer('uploaded_by'),
  createdAt: text('created_at').notNull()
})

/** One parent, linked to their child. The link is what makes "notify the
    parents of the band" possible: a parent is reached through their kid, not
    through a list someone has to keep in step by hand. Each has their own
    access code for the parents' page — no shared password.

    sectionId is a fallback for parents added before the link existed; the
    section that counts is the one their child is in (see sectionOfParent). */
export const parents = pgTable('parents', {
  id: serial('id').primaryKey(),
  scoutId: integer('scout_id').references(() => scouts.id),
  sectionId: integer('section_id').notNull().references(() => sections.id),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  passcodeHmac: text('passcode_hmac'),
  isActive: boolean('is_active').notNull().default(true),
  addedBy: integer('added_by'),
  createdAt: text('created_at').notNull()
}, t => [uniqueIndex('parent_passcode_uq').on(t.passcodeHmac)])

/** A note or PDF announcement for parents of one section (or the whole troop). */
export const parentPosts = pgTable('parent_posts', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').references(() => sections.id),   // null = all sections
  titleEl: text('title_el').notNull(),
  bodyEl: text('body_el').notNull().default(''),
  fileId: integer('file_id').references(() => files.id),
  isPublished: boolean('is_published').notNull().default(true),
  createdBy: integer('created_by'),
  createdAt: text('created_at').notNull()
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
