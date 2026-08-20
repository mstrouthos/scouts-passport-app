// Prints a complete, ready-to-paste set of production env vars.
// Usage: npm run secrets
import { randomBytes } from 'node:crypto'
import webpush from 'web-push'

const rand = () => randomBytes(24).toString('hex')
const vapid = webpush.generateVAPIDKeys()

console.log(`# Generated ${new Date().toISOString().slice(0, 10)} — paste into Coolify env vars (or .env)
# ⚠ NUXT_PASSCODE_PEPPER: set ONCE, never change — changing it voids every printed passcode.

NUXT_SESSION_PASSWORD=${rand()}
NUXT_PASSCODE_PEPPER=${rand()}
NUXT_CRON_TOKEN=${rand()}
NUXT_PUBLIC_VAPID_PUBLIC_KEY=${vapid.publicKey}
NUXT_VAPID_PRIVATE_KEY=${vapid.privateKey}
NUXT_VAPID_SUBJECT=mailto:you@example.org`)
