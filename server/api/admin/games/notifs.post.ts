import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { byWhom, byWhomEl } from '../../../utils/byWhom'

/** My own say: the mini-games' news on my phone, or not (it still waits in
    each game's 🔔). Not mine to turn back on if an administrator has
    turned it off for me. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const off = !!(await readBody<{ off?: boolean }>(event))?.off
  if (!off && me.gameNotifsBlocked) throw createError({ statusCode: 403, message: `${byWhomEl(await byWhom(me.gameNotifsBlockedBy))} έχει κλείσει τις ειδοποιήσεις των παιχνιδιών για σένα` })
  await (await useDb()).update(s.scouts).set({ gameNotifsOff: off }).where(eq(s.scouts.id, me.id))
  return { ok: true }
})
