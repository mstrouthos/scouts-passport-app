import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb, schema as s } from '../db'
import { childIdsOfParent } from './parents'

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
  const invites = await db.select().from(s.formInvites).where(eq(s.formInvites.formId, formId))
  if (!invites.length) return { invited: 0, answered: 0, pending: [], done: [], lastReminder: null as string | null }
  const parents = await db.select().from(s.parents)
  const links = await db.select().from(s.parentChildren)
  const scouts = await db.select({ id: s.scouts.id, firstName: s.scouts.firstName }).from(s.scouts)
  const sent = (await db.select({ parentId: s.formResponses.parentId, createdAt: s.formResponses.createdAt })
    .from(s.formResponses).where(eq(s.formResponses.formId, formId))).filter(r => r.parentId != null)
  const kidsOf = (pid: number) => {
    const p = parents.find(x => x.id === pid)
    return p ? childIdsOfParent(p, links) : []
  }
  const rows = invites.map(i => {
    const p = parents.find(x => x.id === i.parentId)
    const kids = kidsOf(i.parentId)
    // an answer from them, or from a parent who shares a child with them
    const by = sent.find(r => r.parentId === i.parentId || kidsOf(r.parentId!).some(k => kids.includes(k)))
    return {
      parentId: i.parentId, name: p?.name ?? '—', active: !!p?.isActive,
      children: kids.map(k => scouts.find(x => x.id === k)?.firstName).filter(Boolean) as string[],
      answeredAt: by?.createdAt ?? null,
      answeredBy: by && by.parentId !== i.parentId ? parents.find(x => x.id === by.parentId)?.name ?? null : null,
      remindedAt: i.remindedAt
    }
  }).filter(r => r.active).sort((a, b) => a.name.localeCompare(b.name, 'el'))
  const done = rows.filter(r => r.answeredAt)
  return {
    invited: rows.length, answered: done.length,
    pending: rows.filter(r => !r.answeredAt), done,
    lastReminder: invites.map(i => i.remindedAt).filter(Boolean).sort().pop() ?? null
  }
}
