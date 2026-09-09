import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../../db'
import { requireLeader, idParam, scopedSectionIds, sectionOfWith } from '../../../../utils/guard'
import { assertCan } from '../../../../utils/permissions'
import { hmacPasscode, generatePasscode } from '../../../../utils/passcode'

/** Bring a trashed member back. Their old code was replaced when they were
    trashed, so a fresh one is issued and returned to hand over. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  const db = (await useDb())
  const r = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!r || !r.deletedAt) throw createError({ statusCode: 404, message: 'Not in the trash' })
  const secIds = await scopedSectionIds(me)
  if (secIds !== null) {
    const sid = sectionOfWith(r as any, await db.select().from(s.patrols))
    if (sid == null || !secIds.includes(sid)) throw createError({ statusCode: 403, message: 'Out of your sector' })
  }
  const passcode = generatePasscode()
  await db.update(s.scouts).set({
    deletedAt: null, deletedBy: null, isActive: true, passcodeHmac: hmacPasscode(passcode)
  }).where(eq(s.scouts.id, id))
  return { ok: true, passcode }
})
