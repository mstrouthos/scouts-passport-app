import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader, assertScoutInScope, assertLeaderInScope, idParam } from '../../../utils/guard'
import { cascadeDeleteScout } from '../../../utils/deleteScout'
import { assertCan } from '../../../utils/permissions'
import { hmacPasscode, generatePasscode, now } from '../../../utils/passcode'

/** Trash a member. The row stays 30 days — listed under Διαγραμμένα, with who
    trashed it and when — and can be restored; then the cron removes it with
    everything that referenced it. Trashing locks them out at once: the
    passcode is replaced (which also ends any session holding the old one)
    and their push subscriptions go. ?permanent=1 skips the wait — the
    Αρχηγός Συστήματος only. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  await assertCan(me, 'roster.edit')
  const id = idParam(event)
  if (id === me.id) throw createError({ statusCode: 400, message: 'You cannot delete yourself' })
  const db = (await useDb())
  const target = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!target) throw createError({ statusCode: 404, message: 'Not found' })
  if (target.role === 'scout') await assertScoutInScope(me, id)
  else await assertLeaderInScope(me, id)

  if (String(getQuery(event).permanent || '') === '1') {
    if (me.role !== 'troop_leader') throw createError({ statusCode: 403, message: 'Only the Αρχηγός Συστήματος can delete permanently' })
    await cascadeDeleteScout(id)
    return { ok: true, permanent: true }
  }

  await db.update(s.scouts).set({
    deletedAt: now(), deletedBy: me.id, isActive: false,
    passcodeHmac: hmacPasscode(generatePasscode())   // a code nobody knows: locked out
  }).where(eq(s.scouts.id, id))
  await db.delete(s.pushSubscriptions).where(eq(s.pushSubscriptions.scoutId, id))
  return { ok: true, trashed: true }
})
