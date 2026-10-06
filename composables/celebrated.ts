/* The wins this phone has already played a celebration for — so one seen by
   tapping its notification is not played again when the app next opens. */
const KEY = 'celebrated'
const list = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] } }
export function markCelebrated(key: string) {
  if (!import.meta.client) return
  try { localStorage.setItem(KEY, JSON.stringify([...list().filter(k => k !== key), key].slice(-200))) } catch {}
}
export const wasCelebrated = (key: string) => import.meta.client && list().includes(key)
