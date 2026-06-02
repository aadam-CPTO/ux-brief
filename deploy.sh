#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# UX Brief - Vercel env + deploy
# Project is already linked (aadam-5907s-projects/ux-brief). This pushes every
# var from .env.local to all environments, then deploys to production.
# Run from the project root:   bash deploy.sh
# Optional non-interactive auth: VERCEL_TOKEN=vck_... bash deploy.sh
# -----------------------------------------------------------------------------
set -eo pipefail

ENV_FILE=".env.local"
PROJECT_NAME="ux-brief"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Run this from the project root."
  exit 1
fi

VERCEL="npx --yes vercel@latest"
if [ -n "$VERCEL_TOKEN" ]; then
  VERCEL="$VERCEL --token $VERCEL_TOKEN"
  echo "Using VERCEL_TOKEN from environment."
else
  $VERCEL whoami >/dev/null 2>&1 || $VERCEL login
fi

# Link ONLY if not already linked. (vercel link rewrites .env.local with cloud
# values, which would wipe the real keys — so we never run it on a linked project.)
if [ ! -d ".vercel" ]; then
  $VERCEL link --yes --project "$PROJECT_NAME" >/dev/null
  # link pulls cloud env into .env.local; that's not what we want here.
  echo "NOTE: project linked. If .env.local was altered, restore it before continuing."
fi

echo "Pushing environment variables from $ENV_FILE ..."
while IFS= read -r line || [ -n "$line" ]; do
  # skip blank lines and comments
  case "$line" in
    ''|\#*) continue ;;
  esac
  # split on the first '='
  case "$line" in
    *=*) ;;
    *) continue ;;
  esac
  key=${line%%=*}
  val=${line#*=}
  key=$(printf '%s' "$key" | tr -d '[:space:]')
  val=${val%$'\r'}
  [ -z "$key" ] && continue
  for target in production preview development; do
    $VERCEL env rm "$key" "$target" --yes >/dev/null 2>&1 || true
    printf '%s' "$val" | $VERCEL env add "$key" "$target" >/dev/null 2>&1 || true
    echo "   added $key -> $target"
  done
done < "$ENV_FILE"

echo "Deploying to production ..."
$VERCEL deploy --prod

echo ""
echo "Done. Reminder: NEXT_PUBLIC_APP_URL is still http://localhost:3000."
echo "After the deploy, point it at your real URL and redeploy:"
echo "  npx vercel env rm NEXT_PUBLIC_APP_URL production --yes"
echo "  printf 'https://<your-app>.vercel.app' | npx vercel env add NEXT_PUBLIC_APP_URL production"
echo "  npx vercel deploy --prod"
