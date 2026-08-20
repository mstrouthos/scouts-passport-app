/** Optional email via Resend (https://resend.com). Silently no-op without a key. */
export async function sendEmails(to: string[], subject: string, text: string): Promise<number> {
  const cfg = useRuntimeConfig()
  if (!cfg.resendApiKey || !cfg.emailFrom || !to.length) return 0
  let sent = 0
  // Resend batch endpoint takes up to 100 items; one recipient per mail (no leaked address lists)
  for (let i = 0; i < to.length; i += 100) {
    const batch = to.slice(i, i + 100).map(addr => ({
      from: cfg.emailFrom, to: [addr], subject, text
    }))
    try {
      const res = await $fetch<any>('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.resendApiKey}` },
        body: batch
      })
      sent += res?.data?.length ?? batch.length
    } catch (e) {
      console.error('[email] batch failed', e)
    }
  }
  return sent
}
