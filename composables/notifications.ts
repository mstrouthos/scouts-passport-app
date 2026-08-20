export type Notif = { id: number, kind: string, refId: number | null, title: string, body: string, createdAt: string, read: boolean }

const list = () => useState<Notif[]>('notifs', () => [])
const loaded = () => useState<boolean>('notifsLoaded', () => false)

export function useNotifications() {
  const items = list()
  const unread = computed(() => items.value.filter(n => !n.read).length)

  async function load(force = false) {
    if (loaded().value && !force) return
    try { items.value = await $fetch<Notif[]>('/api/notifications') } catch { items.value = [] }
    loaded().value = true
  }
  async function markRead(id: number) {
    const n = items.value.find(x => x.id === id)
    if (!n || n.read) return
    n.read = true
    try { await $fetch(`/api/notifications/${id}/read`, { method: 'POST' }) } catch {}
  }
  function reset() { items.value = []; loaded().value = false }

  return { items, unread, load, markRead, reset }
}
