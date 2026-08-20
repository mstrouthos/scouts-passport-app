/** Optional SMS via SMS.to (https://sms.to). Silently no-ops without an API key.
    Uses the current v2 endpoint (api.sms.to/v2/messages, one recipient per
    call) — the older /sms/send endpoint this used to call returns 200 without
    a `success` field, so a naive "not explicitly false" check always reported
    "sent" even when nothing was actually delivered. */
export async function sendSms(toNumbers: string[], message: string): Promise<number> {
  const cfg = useRuntimeConfig()
  const numbers = [...new Set(toNumbers.map(n => n.trim()).filter(Boolean))]
  if (!cfg.smsToApiKey || !numbers.length) return 0

  let sent = 0
  for (const to of numbers) {
    const body = { message, to, sender_id: cfg.smsSenderId || undefined }
    console.log('[sms] sending', JSON.stringify({ ...body, keyLen: cfg.smsToApiKey.length, keyPrefix: cfg.smsToApiKey.slice(0, 4) }))
    try {
      const res = await $fetch<any>('https://api.sms.to/v2/messages', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.smsToApiKey}`, 'content-type': 'application/json' },
        body
      })
      if (res?.success === true) sent++
      else console.error('[sms] not accepted for', to, JSON.stringify(res))
    } catch (e: any) {
      console.error('[sms] send failed for', to, JSON.stringify({
        status: e?.response?.status ?? e?.statusCode, statusText: e?.response?.statusText ?? e?.statusMessage,
        data: e?.data, message: e?.message
      }))
    }
  }
  return sent
}
