import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { PACK_SLUG, weekStartOf, nextMeetingFor } from '../../utils/pack'

/** What a family in the Αγέλη sees on their own page: the next συγκέντρωση and
    what it is about, the εξάδες' κραυγές, and this week's challenges. Empty
    for every other sector, which runs a different programme. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  // a parent with children in two sectors sees this only for the Αγέλη one
  const section = (await db.select().from(s.sections))
    .find(x => x.slug === PACK_SLUG && p.sectionIds.includes(x.id))
  if (!section) return { isPack: false }

  const week = weekStartOf()
  const challenges = (await db.select().from(s.packChallenges))
    .filter(c => c.sectionId === section.id && c.weekStart === week)
    .sort((a, b) => a.id - b.id)

  const chants = (await db.select().from(s.patrols))
    .filter(x => x.sectionId === section.id && x.chantEl)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(x => ({ id: x.id, nameEl: x.nameEl, emblem: x.emblem, chantEl: x.chantEl }))

  return {
    isPack: true,
    weekStart: week,
    nextMeeting: await nextMeetingFor(section.id),
    chants,
    challenges: challenges.map(c => ({ id: c.id, textEl: c.textEl, emoji: c.emoji }))
  }
})
