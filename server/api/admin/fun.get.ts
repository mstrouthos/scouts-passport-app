import { gt } from 'drizzle-orm'
import { useDb, schema as s } from '../../db'
import { requireLeader } from '../../utils/guard'
import { faceOf } from '../../utils/face'
import { normalizeAvatar } from '../../../utils/avatar'
import { FUN_LIMIT_DAY, cyprusDayStart, funPaused } from '../../utils/leaderFun'

/** The playground: every Βαθμοφόρος of every sector, standing; what has
    been going on lately; and the marks still on anyone. */
export default defineEventHandler(async (event) => {
  const me = await requireLeader(event)
  const db = await useDb()
  const [people, scopes, sections, patrols] = await Promise.all([
    db.select().from(s.scouts), db.select().from(s.leaderScopes), db.select().from(s.sections), db.select().from(s.patrols)])
  const leaders = people.filter(r => r.role !== 'scout' && r.isActive && !r.deletedAt && (!r.isHidden || r.id === me.id))
  const secName = (id: number | null) => sections.find(x => x.id === id)?.nameEl
  const where = (l: typeof people[number]) => {
    if (l.role === 'troop_leader') return 'Όλο το Σύστημα'
    const names = [...new Set(scopes.filter(x => x.scoutId === l.id).map(x => x.scope === 'troop' ? 'Όλο το Σύστημα'
      : x.scope === 'section' ? secName(x.sectionId) : secName(patrols.find(p => p.id === x.patrolId)?.sectionId ?? null)).filter(Boolean))]
    return names.join(' · ')
  }
  const since = new Date(Date.now() - 7 * 86400_000).toISOString()
  const recent = (await db.select().from(s.leaderFun).where(gt(s.leaderFun.createdAt, since)))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const nameOf = (id: number) => people.find(p => p.id === id)?.firstName ?? '—'
  // standing, the avatar shows even for one who uses a photo as their face
  const figure = (raw: string | null) => { try { return raw ? normalizeAvatar(JSON.parse(raw)) : null } catch { return null } }
  const today = cyprusDayStart()
  return {
    paused: await funPaused(), canPause: me.role === 'troop_leader',
    me: { id: me.id, pref: me.funPref, sentToday: recent.filter(r => r.fromId === me.id && r.createdAt >= today).length, limit: FUN_LIMIT_DAY },
    leaders: leaders.map(l => ({ id: l.id, firstName: l.firstName, lastName: l.lastName, ...faceOf(l), figure: figure(l.avatar), where: where(l), me: l.id === me.id, pref: l.funPref }))
      .sort((a, b) => Number(b.me) - Number(a.me) || a.firstName.localeCompare(b.firstName, 'el')),
    // what was done, newest first — the marks are worked out from it on the page
    recent: recent.slice(0, 300).map(r => ({ id: r.id, from: r.fromId, fromName: nameOf(r.fromId), to: r.toId, toName: nameOf(r.toId), action: r.action, at: r.createdAt }))
  }
})
