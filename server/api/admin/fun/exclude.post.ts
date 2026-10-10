import { and, eq, isNull } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireTroopLeader } from '../../../utils/guard'
import { now } from '../../../utils/passcode'
import { activePotato, potatoTick, potatoPool, potatoCycle, potatoTargets, stopPotato, tellFun } from '../../../utils/leaderFun'
import { shortName } from '../../../../utils/shortName'

/** An administrator leaves a Βαθμοφόρος out of the games that need them
    to take part — or lets them back in. Left out while they hold the potato,
    it is thrown on at once to someone who has not had it this round (and that
    one is told); with nobody left to take it, the round simply ends. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const b = await readBody<{ id?: number, out?: boolean }>(event)
  const id = Number(b?.id), out = !!b?.out
  const db = await useDb()
  const who = (await db.select().from(s.scouts).where(eq(s.scouts.id, id)).limit(1))[0]
  if (!who || who.role === 'scout') throw createError({ statusCode: 404, message: 'Not found' })
  await db.update(s.scouts).set({ gamesExcluded: out, gamesExcludedBy: out ? me.id : null }).where(eq(s.scouts.id, id))

  let passedTo: string | null = null, ended = false
  await potatoTick()
  const p = await activePotato()
  if (out && p && p.holderId === id) {
    const pool = await potatoPool()                    // without them now
    const cycle = potatoCycle(p)
    const fresh = potatoTargets(pool, cycle, id)
    if (!fresh.length) { ended = await stopPotato(me.id) }
    else {
      const to = fresh[Math.floor(Math.random() * fresh.length)]!
      const t = now()
      const next = pool.every(x => [...cycle, to].includes(x)) ? [to] : [...cycle, to]
      const moved = await db.update(s.hotPotato).set({ holderId: to, prevId: id, gotAt: t, passes: p.passes + 1, cycle: JSON.stringify(next) })
        .where(and(eq(s.hotPotato.id, p.id), eq(s.hotPotato.holderId, id), isNull(s.hotPotato.endedAt))).returning()
      if (moved.length) {
        // thrown for them, not by them: 'forced' keeps it out of the points
        const [row] = await db.insert(s.leaderFun).values({ fromId: id, toId: to, action: 'potato', createdAt: t, auto: true, outcome: 'forced' }).returning()
        const target = (await db.select({ firstName: s.scouts.firstName, lastName: s.scouts.lastName }).from(s.scouts).where(eq(s.scouts.id, to)))[0]
        passedTo = shortName(target) || null
        await tellFun(to, { title: '🥔 Η καυτή πατάτα', kind: 'potato-pass', refId: row!.id,
          body: `Η καυτή πατάτα πέρασε σε σένα — ${shortName(who)} βγήκε από το παιχνίδι. Πέτα τη γρήγορα σε κάποιον! 💣${p.challenge ? ` Όποιον σκάσει: «${p.challenge}»` : ''}` }, true)
      }
    }
  }
  return { ok: true, passedTo, ended }
})
