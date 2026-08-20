#!/usr/bin/env bash
# Boring on purpose: pull, rebuild, restart, backup.
set -euo pipefail
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d --build
# nightly-style backup on every deploy too
mkdir -p data/backups
if [ -f data/passport.db ]; then
  cp data/passport.db "data/backups/passport-$(date +%F-%H%M).db"
  ls -t data/backups/passport-*.db | tail -n +15 | xargs rm -f 2>/dev/null || true
fi
echo "Deployed. Cron reminder: */5 * * * * curl -fsS -X POST -H \"x-cron-token: \$NUXT_CRON_TOKEN\" https://YOUR-DOMAIN/api/cron/tick"
