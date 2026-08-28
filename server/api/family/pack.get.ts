import { useDb, schema as s } from '../../db'
import { requireParent } from '../../utils/parentGuard'
import { packSections, weekStartOf, nextMeetingFor } from '../../utils/pack'

/** What a family in the Αγέλη or the Μικρή Αγέλη sees on their own page: the
    next συγκέντρωση and what it is about, and this week's challenges. Those
    children never sign in, so this is the only place their programme appears.
    A parent with children in both sectors gets a block for each; the other two
    sectors run a different programme and get none. */
export default defineEventHandler(async (event) => {
  const p = await requireParent(event)
  const db = await useDb()
  const mine = (await packSections()).filter(x => p.sectionIds.includes(x.id))
  if (!mine.length) return { isPack: false, packs: [] }

  const week = weekStartOf()
  const all = await db.select().from(s.packChallenges)
  const packs = []
  for (const section of mine) {
    packs.push({
      sectionId: section.id,
      sectionEl: section.nameEl,
      sectionEn: section.nameEn,
      weekStart: week,
      nextMeeting: await nextMeetingFor(section.id),
      challenges: all
        .filter(c => c.sectionId === section.id && c.weekStart === week)
        .sort((a, b) => a.id - b.id)
        .map(c => ({ id: c.id, textEl: c.textEl, emoji: c.emoji }))
    })
  }
  // labelled only when the family straddles both sectors
  return { isPack: true, multi: packs.length > 1, weekStart: week, packs }
})
