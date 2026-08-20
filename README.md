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

First boot creates `data/passport.db` with the troop structure (the four
sections, three starter Scout Troop teams, the badge catalogue and the info
pages) and a **single** account. The member roster starts empty.

| Passcode | Who | Role |
|---|---|---|
| `1111-2222` | ΠΑΝΑΓΙΩΤΗΣ ΚΑΙΜΗΣ | Αρχηγός Συστήματος — sees everything, assigns roles |

Sign in with that, **rotate the passcode immediately** (Προφίλ → Νέος κωδικός),
then add the real Βαθμοφόροι and members from Πρόσκοποι → +.

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
