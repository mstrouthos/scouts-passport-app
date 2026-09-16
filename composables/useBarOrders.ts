/* The crew's orders, refreshed every few seconds while the screen is open.
   Polling, not sockets: it survives the venue's Wi-Fi. */
export function useBarOrders(intervalMs = 3000) {
  const orders = ref<any[]>([])
  const toast = ref('')
  let timer: any = null
  let toastTimer: any = null
  async function refresh() {
    try { orders.value = await $fetch<any[]>('/api/bar/orders') } catch {}
  }
  function say(msg: string) {
    toast.value = msg
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 1800)
  }
  async function act(id: number, action: string, body?: any) {
    try {
      await $fetch(`/api/bar/orders/${id}/${action}`, { method: 'POST', body })
      await refresh()
      return true
    } catch (e: any) { say(e?.data?.message || 'Κάτι πήγε στραβά'); return false }
  }
  onMounted(() => { refresh(); timer = setInterval(refresh, intervalMs) })
  onUnmounted(() => { clearInterval(timer); clearTimeout(toastTimer) })
  return { orders, refresh, act, toast, say }
}
export const eur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €'
export const clock = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) : ''
export const KIND = { cash: 'Μετρητά', card: 'Κάρτα', coupon: 'Κουπόνια' } as Record<string, string>
export const payLabel = (o: any) => {
  const k = KIND[o.paidMethod] || '—'
  if (!o.paidAt) return `${k} · εκκρεμεί`
  return o.paidMethod === 'card' && o.accountName ? `${k} ✓ ${o.accountName}` : `${k} ✓`
}
export const payClass = (o: any) => o.paidAt ? 'paid' : o.paidMethod === 'card' ? 'pending' : 'unpaid'
