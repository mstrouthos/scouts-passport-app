# Deploying on Coolify

Build pack: **Dockerfile** (not Nixpacks — the repo's Dockerfile pins Node 22
and ships a small runtime image). Data lives in a Coolify-managed Postgres
service, so the container itself is stateless and safe to recreate.

The `docker-compose.yml` / `Caddyfile` / `deploy.sh` in this repo are for the
bare-VPS path — **ignore them on Coolify**; its own proxy terminates TLS.

## 1. Create the application

- **+ New → Application → Public/Private Git** → `mstrouthos/scouts-passport-app`, branch `main`
- **Build Pack:** Dockerfile (root `Dockerfile`, context `.`)
- **Port:** `3000`
- **Domain:** your real domain (e.g. `passport.example.org`). HTTPS must be on —
  PWA install and push require it. Coolify issues the certificate automatically.

## 2. Database — a Coolify-managed Postgres (REQUIRED)

The app stores everything in Postgres. Create the database **before** the first
deploy:

- Coolify → **+ New → Database → PostgreSQL** (put it in the same Project as the
  app so they share a network).
- Once it is running, open it and copy the **internal** connection URL. It looks
  like `postgres://postgres:<password>@<service-name>:5432/postgres`.
- Paste that into the application's `NUXT_DATABASE_URL` environment variable
  (section 3).

Use the **internal** URL, not the public one — it stays on Coolify's private
network, so the database never needs to be exposed to the internet.

Coolify manages this volume itself, so the data survives redeploys, and its
built-in database backups can be scheduled against it.

The app creates its own tables on first boot and seeds a single Αρχηγός
Συστήματος account (`1111-2222` — rotate it immediately). It never drops or
recreates anything that already exists, so redeploying is safe.

Check the logs after a deploy:

```
[db] connecting to postgres://postgres:***@.../postgres
[db] ready
```

`[seed] … Roster starts empty.` appears only on the very first boot against an
empty database. **If you see that line on a later deploy, you are pointing at a
different (empty) database** — check `NUXT_DATABASE_URL`.

## 3. Environment variables

Generate everything in one command (run locally, in the repo):

```bash
npm run secrets
```

Paste the output into Coolify's Environment Variables panel, fix the
`NUXT_VAPID_SUBJECT` email, and you're done.

| Variable | Value |
|---|---|
| `NUXT_SESSION_PASSWORD` | random, 32+ chars |
| `NUXT_PASSCODE_PEPPER` | random — **set once, never change** (changing voids every passcode) |
| `NUXT_CRON_TOKEN` | random |
| `NUXT_DATABASE_URL` | the Postgres **internal** URL from section 2 |
| `NUXT_PUBLIC_VAPID_PUBLIC_KEY` | from `npx web-push generate-vapid-keys` |
| `NUXT_VAPID_PRIVATE_KEY` | ditto |
| `NUXT_VAPID_SUBJECT` | `mailto:you@example.org` |


## 4. Scheduled task (challenge unlocks + event reminders)

Coolify → the application → **Scheduled Tasks** → every 5 minutes
(`*/5 * * * *`), command run **inside the container**:

```
node -e "fetch('http://localhost:3000/api/cron/tick',{method:'POST',headers:{'x-cron-token':process.env.NUXT_CRON_TOKEN}}).then(r=>r.text()).then(console.log)"
```

(The runtime image has no curl; Node's fetch does the job.)

## 5. Backups

Coolify backs the Postgres service up for you: open the database →
**Backups** → enable scheduled backups (daily is fine) and, if you have S3
configured, send them off-box. A backup that only lives on the machine that
dies is not a backup.

## 6. First login & go-live

1. Sign in as `1111-2222` (ΠΑΝΑΓΙΩΤΗΣ ΚΑΙΜΗΣ, Αρχηγός Συστήματος).
2. **Immediately rotate it**: Προφίλ → Νέος κωδικός. That passcode is public in
   this repo — do this before anything else.
3. Add the real Βαθμοφόροι and members (Πρόσκοποι → +), texting or writing down
   each passcode as you go.
4. Grant full access to any other Διαχειριστές you need
   (Άλλα → Ρόλοι & δικαιώματα → the person → Δικαιώματα).
5. Print login cards if you prefer paper (Πρόσκοποι → Κάρτες εισόδου) — note
   that printing regenerates the selected members' passcodes.

The roster starts empty; only the structure (sections, starter teams, badge
catalogue, info pages) and your own account are created.
