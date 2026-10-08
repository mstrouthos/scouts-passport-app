import { desc } from 'drizzle-orm'
import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { potatoTick } from '../../../utils/leaderFun'
import { shortName } from '../../../../utils/shortName'

/** The latest hot potato round, for the announcement every Βαθμοφόρος sees
    when they open the app: a round has started (and what is at stake), or it
    has burst (on whom, and what they must now do), or it was ended. Two days
    on, it is old news. Never when it bursts. A Βαθμοφόρος who has never seen
    the video that explains the game is shown it with a new round. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  if (me.funPref === 'off') return null
  await potatoTick()
  const db = await useDb()
  const p = (await db.select().from(s.hotPotato).orderBy(desc(s.hotPotato.id)).limit(1))[0]
  if (!p) return null
  const since = Date.now() - 2 * 86400_000
  if (p.endedAt && Date.parse(p.endedAt) < since) return null
  const people = await db.select({ id: s.scouts.id, firstName: s.scouts.firstName, lastName: s.scouts.lastName }).from(s.scouts)
  const name = (id: number | null) => shortName(people.find(x => x.id === id)) || null
  return {
    id: p.id,
    state: !p.endedAt ? 'active' : p.burnedId ? 'burst' : 'stopped',
    challenge: p.challenge,
    startedBy: name(p.startedBy), burned: name(p.burnedId), burnedIsMe: p.burnedId === me.id,
    passes: p.passes,
    // their first new round: the video that explains the game plays with it
    video: !p.endedAt && !me.potatoVideoSeen
  }
})
