import { useDb, schema as s } from '../db'
import { requireScout, sectionOfWith } from '../utils/guard'
import { boardFor } from '../utils/board'

/** The member's own sector's league table. */
export default defineEventHandler(async (event) => {
  const me = await requireScout(event)
  const allPatrols = await (await useDb()).select().from(s.patrols)
  return boardFor(sectionOfWith(me, allPatrols), me.id)
})
