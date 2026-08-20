/** Optional SMS via SMS.to (https://sms.to). Silently no-ops without an API key. */

/** SMS.to alphanumeric sender IDs must be pre-registered and are alphanumeric
    only — spaces and punctuation are rejected by the carriers, which shows up
    as an accepted API call whose message never arrives. Rather than fail, drop
    an invalid sender id and let SMS.to send from its shared number. */
function resolveSenderId(raw?: string): string | undefined {
  const v = String(raw ?? '').trim()
  if (!v) return undefined
  if (/^[A-Za-z0-9]{1,11}$/.test(v)) return v
  console.warn(`[sms] ignoring NUXT_SMS_SENDER_ID ${JSON.stringify(v)} — must be 1-11 alphanumeric chars, no spaces, and registered with SMS.to. Sending from the shared number instead.`)
  return undefined
}

export async function sendSms(toNumbers: string[], message: string): Promise<number> {
  const cfg = useRuntimeConfig()
  const numbers = [...new Set(toNumbers.map(n => n.trim()).filter(Boolean))]
  if (!cfg.smsToApiKey || !numbers.length) return 0
  const senderId = resolveSenderId(cfg.smsSenderId)

  let sent = 0
  for (const to of numbers) {
    try {
      const res = await $fetch<any>('https://api.sms.to/sms/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.smsToApiKey}`, 'content-type': 'application/json' },
        body: { message, to, sender_id: senderId }
      })
      // Log the accepted response verbatim: SMS.to can accept a request and still
      // reject the message downstream, and the body is the only place that shows up.
      console.log('[sms] response for', to, JSON.stringify(res))
      if (res?.success === false) console.error('[sms] rejected for', to, JSON.stringify(res))
      else sent++
    } catch (e: any) {
      console.error('[sms] send failed for', to, JSON.stringify({
        status: e?.response?.status ?? e?.statusCode, statusText: e?.response?.statusText ?? e?.statusMessage,
        data: e?.data, message: e?.message
      }))
    }
  }
  return sent
}
