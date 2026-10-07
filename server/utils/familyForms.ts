import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { childIdsOfParent, sectionsOfParent } from './parents'
import { sectionOfWith } from './guard'

/* A form lives on its own address (forms.scouts30.org), where the family
   page's sign-in does not reach. So the link a parent opens from the app
   carries a ticket, signed and good for a week, naming them and that form:
   what they send with it is kept as theirs, for them to find again. A form
   opened any other way is sent as before, by nobody in particular. */
const TICKET_MS = 7 * 24 * 3600_000
const sign = (body: string) => createHmac('sha256', String(useRuntimeConfig().passcodePepper)).update('form-parent:' + body).digest('hex')

export function parentTicket(parentId: number, formId: number) {
  const at = Date.now()
  return `${parentId}.${at}.${sign(`${parentId}:${formId}:${at}`)}`
}

/** The parent a ticket names, when it is genuine, recent and for this form. */
export function parentOfTicket(ticket: unknown, formId: number): number | null {
  const [pid, at, mac] = String(ticket || '').split('.')
  const parentId = Number(pid), when = Number(at)
  if (!Number.isInteger(parentId) || !when || !mac || Date.now() - when > TICKET_MS || when > Date.now() + 60_000) return null
  const want = Buffer.from(sign(`${parentId}:${formId}:${when}`))
  const got = Buffer.from(mac)
  return want.length === got.length && timingSafeEqual(want, got) ? parentId : null
}

/** Where a form opens: on the forms address on the real site, here on a
    test machine without it. */
export function formLink(event: H3Event, slug: string, ticket?: string) {
  const host = getRequestHost(event, { xForwardedHost: true }) || ''
  const onSite = /(^|\.)scouts30\.org$/.test(host.split(':')[0])
  const path = onSite ? `https://forms.scouts30.org/${encodeURIComponent(slug)}` : `/forms/${encodeURIComponent(slug)}`
  return ticket ? `${path}?k=${encodeURIComponent(ticket)}` : path
}

/** The parent and anyone who shares a child with them: a form one of them
    has sent is no longer waiting for the other. */
export async function familyOf(parentId: number): Promise<number[]> {
  const db = await useDb()
  const links = await db.select().from(s.parentChildren)
  const parents = await db.select().from(s.parents)
  const me = parents.find(p => p.id === parentId)
  if (!me) return [parentId]
  const kids = new Set(childIdsOfParent(me, links))
  return parents.filter(p => p.id === parentId || childIdsOfParent(p, links).some(c => kids.has(c))).map(p => p.id)
}

/** A response this parent sent, or 404. */
export async function ownResponse(parentId: number, id: number) {
  const db = await useDb()
  const r = (await db.select().from(s.formResponses).where(eq(s.formResponses.id, id)).limit(1))[0]
  if (!r || r.parentId !== parentId) throw createError({ statusCode: 404, message: 'Not found' })
  return r
}

/** Who a form was sent to and where each stands: answered (by them or the
    other parent of the same child, from the app) or still waiting. For the
    leaders of the form; names and children only, never answers. */
export async function inviteStatus(formId: number) {
  const db = await useDb()
  const f = (await db.select().from(s.forms).where(eq(s.forms.id, formId)).limit(1))[0]
  const allInvites = await db.select().from(s.formInvites).where(eq(s.formInvites.formId, formId))
  const audience = f ? await audienceOf(f) : []
  // one row per parent the form is for; `sentAt` is when they were notified, if they were
  const invites = audience.map(pid => allInvites.find(i => i.parentId === pid) ?? { formId, parentId: pid, sentAt: '', remindedAt: null as string | null })
  if (!invites.length) return { invited: 0, answered: 0, notified: 0, pending: [], done: [], lastReminder: null as string | null }
  const parents = await db.select().from(s.parents)
  const links = await db.select().from(s.parentChildren)
  const scouts = await db.select({ id: s.scouts.id, firstName: s.scouts.firstName }).from(s.scouts)
  const sent = (await db.select({ parentId: s.formResponses.parentId, createdAt: s.formResponses.createdAt })
    .from(s.formResponses).where(eq(s.formResponses.formId, formId))).filter(r => r.parentId != null)
  const kidsOf = (pid: number) => {
    const p = parents.find(x => x.id === pid)
    return p ? childIdsOfParent(p, links) : []
  }
  /* a registration is done when every child of theirs in its sectors is
     registered for the year — however (and by whichever parent) it was sent */
  const reg = f?.registrationYear ? await (async () => {
    const regs = await db.select().from(s.registrations).where(eq(s.registrations.year, f.registrationYear!))
    const all = await db.select().from(s.scouts)
    const patrols = await db.select().from(s.patrols)
    const secs = parentSectionsOf(f)
    const counts = (k: number) => {
      const m = all.find(x => x.id === k)
      if (!m || m.role !== 'scout' || !m.isActive || m.deletedAt) return false
      const sec = sectionOfWith(m, patrols)
      return !secs || (sec != null && secs.includes(sec))
    }
    return { counts, at: (k: number) => regs.find(r => r.scoutId === k)?.createdAt ?? null }
  })() : null
  const rows = invites.map(i => {
    const p = parents.find(x => x.id === i.parentId)
    const kids = kidsOf(i.parentId)
    // an answer from them, or from a parent who shares a child with them
    let by: { parentId: number | null, createdAt: string } | undefined = sent.find(r => r.parentId === i.parentId || kidsOf(r.parentId!).some(k => kids.includes(k)))
    if (reg) {
      const theirs = kids.filter(reg.counts)
      const dates = theirs.map(reg.at)
      by = theirs.length && dates.every(Boolean) ? { parentId: i.parentId, createdAt: dates.sort().pop()! } : undefined
    }
    return {
      parentId: i.parentId, name: p?.name ?? '—', active: !!p?.isActive,
      children: kids.map(k => scouts.find(x => x.id === k)?.firstName).filter(Boolean) as string[],
      answeredAt: by?.createdAt ?? null,
      answeredBy: by && by.parentId !== i.parentId ? parents.find(x => x.id === by.parentId)?.name ?? null : null,
      remindedAt: i.remindedAt, notified: !!i.sentAt
    }
  }).filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name, 'el'))
  const done = rows.filter(r => r.answeredAt)
  return {
    invited: rows.length, answered: done.length, notified: rows.filter(r => r.notified).length,
    pending: rows.filter(r => !r.answeredAt), done,
    lastReminder: invites.map(i => i.remindedAt).filter(Boolean).sort().pop() ?? null
  }
}

type FormRow = typeof s.forms.$inferSelect
/** The sectors whose parents see a form, or null when they were never chosen. */
export function parentSectionsOf(f: FormRow): number[] | null {
  if (!f.parentSections) return null
  try { const v = JSON.parse(f.parentSections); return Array.isArray(v) ? v.map(Number).filter(Number.isInteger) : null } catch { return null }
}

/** The parents a form is for: those with a child in one of its sectors — so a
    family that joins later sees it too — or, for a form whose sectors were
    never chosen (sent before this existed), those it was sent to. */
export async function audienceOf(f: FormRow): Promise<number[]> {
  const db = await useDb()
  const secs = parentSectionsOf(f)
  if (secs === null) return (await db.select().from(s.formInvites).where(eq(s.formInvites.formId, f.id))).map(i => i.parentId)
  if (!secs.length) return []
  const [parents, links, scouts, patrols] = await Promise.all([
    db.select().from(s.parents), db.select().from(s.parentChildren), db.select().from(s.scouts), db.select().from(s.patrols)])
  return parents.filter(p => p.isActive && sectionsOfParent(p, links, scouts, patrols).some(x => secs.includes(x))).map(p => p.id)
}

/** Whether a family (any of its parents, in any of its sectors) is one a form is for. */
export function formIsFor(f: FormRow, family: number[], familySections: number[], invited: Set<number>) {
  const secs = parentSectionsOf(f)
  return secs === null ? family.some(id => invited.has(id)) : secs.some(x => familySections.includes(x))
}
