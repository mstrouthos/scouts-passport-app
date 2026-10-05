import { requireTroopLeader } from '../../utils/guard'
import { emailReady, sendEmailWithFiles } from '../../utils/email'
import { reportError } from '../../utils/errorReport'

/** An administrator checks that email goes out: one short message to the
    address they type. Whether it is set up at all is said plainly; why a
    send failed goes to Discord, never to the screen. */
export default defineEventHandler(async (event) => {
  const me = await requireTroopLeader(event)
  const to = String((await readBody<any>(event))?.to || '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 200) return { ok: false, why: 'address' }
  if (!emailReady()) return { ok: false, why: 'setup' }
  const when = new Date().toLocaleString('el-GR', { timeZone: 'Europe/Nicosia', hourCycle: 'h23' })
  try {
    await sendEmailWithFiles(to, 'Δοκιμή email · Πύλη Προσκόπων', [
      'Γεια σας,',
      '',
      'Αυτό είναι δοκιμαστικό μήνυμα από την Πύλη Προσκόπων.',
      'Αν το λαμβάνετε, η αποστολή email λειτουργεί.',
      '',
      `Στάλθηκε από: ${me.firstName} ${me.lastName} · ${when}`,
      '',
      '30ον Σύστημα Ελλήνων Προσκόπων Αμμοχώστου'
    ].join('\n'), [])
    return { ok: true }
  } catch (e) {
    await reportError('Δοκιμή email', e, {}, event)
    return { ok: false, why: 'failed' }
  }
})
