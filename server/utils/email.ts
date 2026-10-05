import { noteError } from './errorReport'

const DEFAULT_NAME = '30ον Σύστημα Ελλήνων Προσκόπων Αμμοχώστου'

/** Who the email is from, as "Name <address>": NUXT_EMAIL_FROM_NAME and
    NUXT_EMAIL_FROM_ADDRESS, or the older NUXT_EMAIL_FROM with both in one.
    Empty when there is no address to send from. */
function sender(): string {
  const cfg = useRuntimeConfig() as any
  const address = String(cfg.emailFromAddress || '').trim()
  if (!address) return String(cfg.emailFrom || '').trim()
  // the name in quotes, so a comma or a dot in it cannot break the header
  const name = String(cfg.emailFromName || '').replace(/["<>\r\n]/g, '').trim() || DEFAULT_NAME
  return `"${name}" <${address}>`
}
/** Optional email via Resend (https://resend.com). Silently no-op without a key. */
export async function sendEmails(to: string[], subject: string, text: string): Promise<number> {
  const cfg = useRuntimeConfig()
  const from = sender()
  if (!cfg.resendApiKey || !from || !to.length) return 0
  let sent = 0
  // Resend batch endpoint takes up to 100 items; one recipient per mail (no leaked address lists)
  for (let i = 0; i < to.length; i += 100) {
    const batch = to.slice(i, i + 100).map(addr => ({
      from, to: [addr], subject, text
    }))
    try {
      const res = await $fetch<any>('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${cfg.resendApiKey}` },
        body: batch
      })
      sent += res?.data?.length ?? batch.length
    } catch (e) {
      noteError('Αποστολή email', e, { recipients: batch.length })
    }
  }
  return sent
}

/** Whether email can be sent at all — a key and a sender are set. */
export function emailReady(): boolean {
  const cfg = useRuntimeConfig()
  return !!(cfg.resendApiKey && sender())
}

/** One email to one person, with files attached. Throws when it is not
    sent, so the caller can say what for. */
export async function sendEmailWithFiles(to: string, subject: string, text: string,
  files: Array<{ name: string, bytes: Buffer }>): Promise<void> {
  const cfg = useRuntimeConfig()
  if (!emailReady()) throw new Error('Email is not set up (NUXT_RESEND_API_KEY / NUXT_EMAIL_FROM_ADDRESS)')
  await $fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.resendApiKey}` },
    body: {
      from: sender(), to: [to], subject, text,
      ...(files.length ? { attachments: files.map(f => ({ filename: f.name, content: f.bytes.toString('base64') })) } : {})
    },
    timeout: 60_000
  })
}
