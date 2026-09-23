/** A notification that has been opened has done its job. It stays in the
    bell for a day afterwards — long enough to find again, short enough that
    the list is the news and not an archive — and is then swept away.
    Unopened ones stay until they are read. */
export const READ_TTL_MS = 24 * 3600_000

export function stillListed(n: { readAt: string | null }, nowMs = Date.now()): boolean {
  if (!n.readAt) return true
  const t = Date.parse(n.readAt)
  return !Number.isFinite(t) || nowMs - t < READ_TTL_MS
}
