/* Telling the server a Βαθμοφόρος has a poll or an event in front of them —
   for the administrators' "who saw it and did not answer". Quietly: a view
   that fails to be counted is not worth an error. */
export function markViewed(kind: 'poll' | 'event', id: number, fromNotification = false) {
  $fetch('/api/admin/views', { method: 'POST', body: { kind, id, via: fromNotification ? 'notification' : 'page' } }).catch(() => {})
}
