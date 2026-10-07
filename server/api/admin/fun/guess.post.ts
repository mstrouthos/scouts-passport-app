import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { funAction } from '../../../../utils/fun'
import { tellFun } from '../../../utils/leaderFun'

/** "Who did it?": the one hit by a throw with no name guesses who threw it.
    Right, and the same thing flies straight back at the thrower; three
    wrong, and the thrower got away with it — and is named. A day after,
    it is too late to guess. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const b = await readBody<{ id?: number, who?: number }>(event)
  const db = await useDb()
  const row = (await db.select().from(s.leaderFun).where(eq(s.leaderFun.id, Number(b?.id))).limit(1))[0]
  if (!row || !row.anon || row.toId !== me.id) throw createError({ statusCode: 404, message: 'Not found' })
  if (row.outcome || Date.now() - Date.parse(row.createdAt) > 24 * 3600_000)
    throw createError({ statusCode: 409, message: 'Το μυστήριο έχει ήδη λυθεί 🕵️' })
  const act = funAction(row.action)!
  const thrower = (await db.select().from(s.scouts).where(eq(s.scouts.id, row.fromId)).limit(1))[0]
  if (Number(b?.who) === row.fromId) {
    await db.update(s.leaderFun).set({ outcome: 'guessed', guesses: row.guesses + 1 }).where(eq(s.leaderFun.id, row.id))
    // paid back in kind, by the game itself
    const [back] = await db.insert(s.leaderFun).values({ fromId: me.id, toId: row.fromId, action: row.action, createdAt: now(), auto: true }).returning()
    await tellFun(row.fromId, { body: `🎯 ${me.firstName} κατάλαβε ότι ήσουν εσύ — και σου την ανταπέδωσε! ${act.emoji}`, refId: back.id })
    return { right: true, from: row.fromId, fromName: thrower?.firstName, backId: back.id, action: row.action }
  }
  const guesses = row.guesses + 1
  if (guesses >= 3) {
    await db.update(s.leaderFun).set({ outcome: 'escaped', guesses }).where(eq(s.leaderFun.id, row.id))
    await tellFun(row.fromId, { body: `😎 Γλίτωσες! ${me.firstName} δεν κατάλαβε ποιος του/της πέταξε ${act.el.toLowerCase()}.`, refId: row.id })
    return { right: false, left: 0, from: row.fromId, fromName: thrower?.firstName }
  }
  await db.update(s.leaderFun).set({ guesses }).where(eq(s.leaderFun.id, row.id))
  return { right: false, left: 3 - guesses }
})
