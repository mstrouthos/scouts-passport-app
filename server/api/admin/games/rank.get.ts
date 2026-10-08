import { useDb, schema as s } from '../../../db'
import { requireLeader } from '../../../utils/guard'
import { faceOf } from '../../../utils/face'
import { normalizeAvatar } from '../../../../utils/avatar'
import { cyprusWeekStart, cyprusDayStart } from '../../../utils/leaderFun'
import { gameScores, totalOf } from '../../../utils/gameRank'
import { scoutYear } from '../../../../utils/scoutYear'

/** The general table of the mini-games: every game added up, this week (since
    Monday) or this scout year (since September); first three on the podium. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const period = getQuery(event).period === 'year' ? 'year' : 'week'
  const since = period === 'week' ? cyprusWeekStart() : cyprusDayStart(new Date(`${scoutYear().slice(0, 4)}-09-01T12:00:00Z`))
  const db = await useDb()
  const people = (await db.select().from(s.scouts)).filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const scores = await gameScores(since)
  const rows = people.map(p => ({ p, parts: scores.get(p.id) })).filter(x => x.parts && totalOf(x.parts) > 0)
    .map(({ p, parts }) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, ...faceOf(p), figure: figure(p.avatar), me: p.id === me.id, parts: parts!, total: totalOf(parts!) }))
    .sort((a, b) => b.total - a.total)
  return { period, rows: rows.map((r, i) => ({ ...r, place: 1 + rows.filter((o, j) => j < i && o.total > r.total).length })) }
})
