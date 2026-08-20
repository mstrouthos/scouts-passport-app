# Deploying on Coolify

Build pack: **Dockerfile** (not Nixpacks — `better-sqlite3` is a native module
and the repo's Dockerfile pins Node 22, builds it in plain Debian, and ships a
small runtime image with the `/data` volume contract baked in).

The `docker-compose.yml` / `Caddyfile` / `deploy.sh` in this repo are for the
bare-VPS path — **ignore them on Coolify**; its own proxy terminates TLS.

## 1. Create the application

- **+ New → Application → Public/Private Git** → `mstrouthos/scouts-passport-app`, branch `main`
- **Build Pack:** Dockerfile (root `Dockerfile`, context `.`)
- **Port:** `3000`
- **Domain:** your real domain (e.g. `passport.example.org`). HTTPS must be on —
  PWA install and push require it. Coolify issues the certificate automatically.

## 2. Persistent storage (REQUIRED — data is destroyed without it)

In Coolify: the application → **Storages** → **Add** → any name → container path
**`/data`**. Then redeploy.

**This is not optional.** The Dockerfile declares `VOLUME /data`, so without a
named volume Docker mounts a *throwaway anonymous volume* there. The app runs
fine, writes its database, and then Docker discards the whole volume the next
time the container is recreated — which is every deploy. The symptom is
unmistakable: **every deployment wipes your scouts and the demo roster comes
back.** If you are seeing that, this step is missing (or the mount path is not
exactly `/data`), and it will keep happening until it is fixed.

The app warns about this on boot. Check the runtime logs for:

```
[db] No existing database at /data/passport.db — creating a new one and seeding demo data.
[db] If you expected your real roster here, /data is NOT a persistent volume.
```

A healthy deploy logs `[db] /data/passport.db (existing)` instead.

Nothing can recover a roster already lost this way — the volume is gone, not
just the file. Fix the mount *before* entering real members, and set up the
backup task in section 5.

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
| `NUXT_PUBLIC_VAPID_PUBLIC_KEY` | from `npx web-push generate-vapid-keys` |
| `NUXT_VAPID_PRIVATE_KEY` | ditto |
| `NUXT_VAPID_SUBJECT` | `mailto:you@example.org` |

`NUXT_DB_PATH` is already `/data/passport.db` in the image; don't override.

## 4. Scheduled task (challenge unlocks + event reminders)

Coolify → the application → **Scheduled Tasks** → every 5 minutes
(`*/5 * * * *`), command run **inside the container**:

```
node -e "fetch('http://localhost:3000/api/cron/tick',{method:'POST',headers:{'x-cron-token':process.env.NUXT_CRON_TOKEN}}).then(r=>r.text()).then(console.log)"
```

(The runtime image has no curl; Node's fetch does the job.)

## 5. Backups

Add a second scheduled task, daily:

```
node -e "const fs=require('fs');fs.mkdirSync('/data/backups',{recursive:true});fs.copyFileSync('/data/passport.db','/data/backups/passport-'+new Date().toISOString().slice(0,10)+'.db');const l=fs.readdirSync('/data/backups').sort();l.slice(0,-14).forEach(f=>fs.rmSync('/data/backups/'+f))"
```

That keeps 14 daily snapshots **on the same volume** — still copy them off the
server periodically (scp/rsync from the host, or Coolify's S3 backup if you
use it). A backup that lives only on the box that dies is not a backup.

## 6. First login & go-live

1. Sign in with the seeded troop leader passcode from the README (`1111-2222`).
2. **Immediately rotate it**: Προφίλ → Νέος κωδικός. The demo codes are public
   in this repo — do this before anything else.
3. Create your real scouts (Πρόσκοποι → +) and appoint leaders
   (Άλλα → Ρόλοι & δικαιώματα), rotating each leader's passcode from that screen.
4. Print real cards (Πρόσκοποι → Κάρτες εισόδου) — printing regenerates the
   selected scouts' passcodes, which also voids every demo code.
5. Deactivate the demo scouts you don't repurpose (tap scout → Απενεργοποίηση).

Don't wipe `/data/passport.db` to "start clean" — an empty database reseeds the
demo troop on next boot.
