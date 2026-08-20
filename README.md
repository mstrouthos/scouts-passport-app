# Διαβατήριο Προσκόπου — Scout Passport

A digital passport PWA for one scout troop: profiles, badges, calendar, quiz
challenges with leaderboards, meeting review (attendance / uniform / game
points), and push notifications. Bilingual (ΕΛ/EN), installable to the home
screen, self-hosted on a single small VPS.

Full product spec: [SPEC.md](SPEC.md). Design prototype: `mockups/ui-mockup.html`.

## Stack

Nuxt 3 (SPA) · Nitro node server · SQLite + Drizzle · nuxt-auth-utils sessions ·
@nuxtjs/i18n · @vite-pwa/nuxt · web-push (VAPID) · Docker + Caddy.

## Development

```bash
npm install
npm run dev
```

First boot creates and seeds `data/passport.db` with a demo troop.

**Demo passcodes** (login is a single 8-digit passcode):

| Passcode | Who | Role |
|---|---|---|
| `1111-2222` | Κυριάκος Λάμπρου | Αρχηγός Συστήματος — sees everything, assigns roles |
| `3333-4444` | Δέσποινα Αντρέου | Αρχηγός Ομάδας Προσκόπων |
| `4444-5555` | Μάριος Σιακαλλής | Υπαρχηγός Ομάδας Προσκόπων (announcements need Δέσποινα's approval) |
| `2222-3333` | Χριστίνα Παύλου | Αρχηγός Αγέλης (no member accounts — manages the parents' page) |
| `6666-7777` | Παναγιώτης Ηλία | Αρχηγός Ενωμοτίας — 🐺 Λύκοι only |
| `7777-8888` | Δήμος Κωνσταντίνου | Υπαρχηγός Ενωμοτίας — 🐺 Λύκοι only |
| `8888-9999` | Ανδρέας Φιλίππου | Αρχηγός Κοινότητας Ανιχνευτών |
| `5555-6666` | Γιώργος Παπαδόπουλος | Scout (🦅 Αετοί) |
| `70NN-00NN` | other scouts | NN = 10 + roster row (7010-0010 …) |

To start from an empty real troop instead, delete `data/passport.db*`, set the
env vars below, and create scouts from the Troop Leader account.

## Production

```bash
cp .env.example .env      # fill in real secrets
./deploy.sh               # git pull + docker compose up -d --build + backup
```

- Set a real domain in `Caddyfile` (TLS is automatic via Let's Encrypt).
- HTTPS is required for PWA install and push.
- **`NUXT_PASSCODE_PEPPER` must never change after go-live** — it voids every
  passcode.
- Host cron for challenge unlocks and event reminders:
  ```
  */5 * * * * curl -fsS -X POST -H "x-cron-token: $NUXT_CRON_TOKEN" https://YOUR-DOMAIN/api/cron/tick
  ```
- Push notifications: `npx web-push generate-vapid-keys`, put the pair in `.env`.
  Without keys the app still works — the notifications toggle reports
  unsupported.
- Backups: `deploy.sh` snapshots the DB into `data/backups/` (kept: 14). Copy
  those **off the server** (Storage Box, rsync to a laptop — anything off-box).

## Security model (short version)

- One system-generated 8-digit passcode per scout, stored as an HMAC with a
  server-side pepper; shown in plaintext only at generation and on printed cards.
- Sessions: sealed httpOnly cookie, ~6 months.
- Roles: `scout`, `leader` (manages one assigned sector only), `troop_leader`
  (everything, and the only role that can assign sectors).
- **Scope is enforced in every `server/api` route**, not in the UI.
- Login rate-limited per IP with a global circuit breaker.

## Repo map

```
server/api/        REST endpoints (scout + admin, scope-checked)
server/db/         schema, DDL, first-boot seed
server/utils/      auth guard, passcode HMAC, web-push
pages/app/         scout app (mobile-first)
pages/admin/       leader app (mobile + tablet/desktop rail layout)
components/        shell, mascot, uniform illustrations, info renderer
i18n/locales/      ΕΛ / EN dictionaries
mockups/           the original interactive design prototype
```
