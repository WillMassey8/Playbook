#!/usr/bin/env bash
# Morning smoke check for App Store submission blockers.
# Usage: ./scripts/verify-submission.sh
set -euo pipefail

PROD="${PROD_ORIGIN:-https://playbook-pink.vercel.app}"
PREV="${PREVIEW_ORIGIN:-https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app}"

check() {
  local label="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$url")
  if [[ "$code" == "$expect" ]]; then
    echo "OK  $label → $code"
  else
    echo "FAIL $label → $code (expected $expect)  $url"
    return 1
  fi
}

js_hash() {
  curl -s "$1/" | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
}

echo "== Preview =="
PREV_JS=$(js_hash "$PREV")
echo "JS  $PREV_JS"
check "privacy" "$PREV/privacy.html" 200
check "terms"   "$PREV/terms.html" 200
check "support" "$PREV/support.html" 200

echo
echo "== Production =="
PROD_JS=$(js_hash "$PROD")
echo "JS  $PROD_JS"
fail=0
check "privacy" "$PROD/privacy.html" 200 || fail=1
check "terms"   "$PROD/terms.html" 200 || fail=1
check "support" "$PROD/support.html" 200 || fail=1

if [[ "$PROD_JS" == "index-NwAGEV6c.js" || "$PROD_JS" == "index-CK9iB24k.js" ]]; then
  echo "FAIL production still on stale bundle ($PROD_JS) — Promote PR #5 in Vercel"
  fail=1
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "Production is ready for ASC Privacy/Terms/Support URLs."
  exit 0
else
  echo "Promote still required before pasting production URLs into App Store Connect."
  exit 1
fi
