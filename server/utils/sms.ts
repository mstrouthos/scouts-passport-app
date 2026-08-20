/** Optional SMS via SMS.to (https://sms.to). Silently no-ops without an API key. */
export async function sendSms(toNumbers: string[], message: string): Promise<number> {
  const cfg = useRuntimeConfig()
  const numbers = [...new Set(toNumbers.map(n => n.trim()).filter(Boolean))]
  if (!cfg.smsToApiKey || !numbers.length) return 0
  try {
    const res = await $fetch<any>('https://api.sms.to/sms/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.smsToApiKey}`, 'content-type': 'application/json' },
      body: { message, to: numbers, sender_id: cfg.smsSenderId || undefined }
    })
    return res?.success === false ? 0 : numbers.length
  } catch (e) {
    console.error('[sms] send failed', e)
    return 0
  }
}
