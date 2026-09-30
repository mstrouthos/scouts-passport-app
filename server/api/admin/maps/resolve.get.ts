import { requireLeader } from '../../../utils/guard'

/** A Google Maps link, pasted into the place search: the short share link
    (maps.app.goo.gl/…) is followed to the full one, and the place's point —
    and its name, where the link has one — is read out of it. Only Google's
    own addresses are followed. */
const GOOGLE = /^(?:[a-z0-9-]+\.)*(?:google\.[a-z.]+|goo\.gl|app\.goo\.gl)$/i

export default defineEventHandler(async (event) => {
  await requireLeader(event)
  let url = String(getQuery(event).url || '').trim()
  for (let hop = 0; hop < 6; hop++) {
    let u: URL
    try { u = new URL(url) } catch { throw createError({ statusCode: 400, message: 'Δεν είναι σύνδεσμος' }) }
    if (u.protocol !== 'https:' || !GOOGLE.test(u.hostname)) throw createError({ statusCode: 400, message: 'Μόνο σύνδεσμοι Google Maps' })
    const point = pointIn(url)
    if (point) return point
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } }).catch(() => null)
    const next = res?.headers.get('location')
    if (!next) break
    url = new URL(next, url).toString()
  }
  // no point in the link: its search words, if any, for an ordinary search
  const q = (() => { try { return new URL(url).searchParams.get('q') } catch { return null } })()
  if (q) return { query: q }
  throw createError({ statusCode: 404, message: 'Δεν βρέθηκε σημείο στον σύνδεσμο' })
})

function pointIn(url: string): { lat: number, lng: number, name: string | null } | null {
  const d = decodeURIComponent(url)
  // the pin itself (!3d…!4d…) is exact; @… is where the map was looking
  const m = d.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || d.match(/[?&](?:q|query|ll|destination|center)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/)
    || d.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
  if (!m) return null
  const name = d.match(/\/place\/([^/@?]+)/)?.[1]?.replace(/\+/g, ' ') ?? null
  return { lat: Number(m[1]), lng: Number(m[2]), name }
}
