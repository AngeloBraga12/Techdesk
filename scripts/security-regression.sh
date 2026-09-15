#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"

assert_status() {
  local expected="$1" actual="$2"
  if [[ "$expected" != "$actual" ]]; then
    echo "Expected HTTP $expected, got $actual"
    exit 1
  fi
}

# Security headers must be present on API responses.
headers=$(curl --fail --silent --dump-header - "$BASE_URL/api/health" -o /tmp/techdesk-security-health.json)
grep -qi '^X-Content-Type-Options: nosniff' <<<"$headers"
grep -qi '^X-Frame-Options: DENY' <<<"$headers"
grep -qi '^Referrer-Policy: no-referrer' <<<"$headers"
grep -qi '^Cache-Control: no-store' <<<"$headers"
grep -qi '^Content-Security-Policy: ' <<<"$headers"

# Password policy: 8 characters is accepted, 7 is rejected.
status=$(curl --silent --output /tmp/techdesk-seven.json --write-out '%{http_code}' \
  --request POST "$BASE_URL/api/auth/register" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Seven","email":"seven@example.com","password":"1234567"}')
assert_status 400 "$status"
grep -q 'VALIDATION_ERROR' /tmp/techdesk-seven.json

status=$(curl --silent --output /tmp/techdesk-eight.json --write-out '%{http_code}' \
  --request POST "$BASE_URL/api/auth/register" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Eight","email":"eight@example.com","password":"12345678"}')
assert_status 201 "$status"
grep -q '"role":"TECHNICIAN"\|"role":"ADMIN"' /tmp/techdesk-eight.json

# CORS must reject an untrusted origin.
status=$(curl --silent --output /tmp/techdesk-cors.json --write-out '%{http_code}' \
  --request OPTIONS "$BASE_URL/api/customers" \
  --header 'Origin: https://evil.example' \
  --header 'Access-Control-Request-Method: GET')
assert_status 403 "$status"
grep -q 'CORS_FORBIDDEN' /tmp/techdesk-cors.json

echo 'Security regression checks passed.'
