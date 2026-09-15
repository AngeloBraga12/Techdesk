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

# Function-level authorization: a technician must not reach administrative endpoints
# or destructive operations reserved for administrators.
status=$(curl --silent --output /tmp/techdesk-technician.json --write-out '%{http_code}' \
  --request POST "$BASE_URL/api/auth/register" \
  --header 'Content-Type: application/json' \
  --data '{"name":"Technician","email":"technician@example.com","password":"12345678"}')
assert_status 201 "$status"

auth_cookie=/tmp/techdesk-technician-cookie.txt
curl --silent --output /tmp/techdesk-technician-login.json --dump-header /tmp/techdesk-technician-login-headers.txt \
  --request POST "$BASE_URL/api/auth/login" \
  --header 'Content-Type: application/json' \
  --cookie-jar "$auth_cookie" \
  --data '{"email":"technician@example.com","password":"12345678"}'

grep -q '"role":"TECHNICIAN"' /tmp/techdesk-technician-login.json

status=$(curl --silent --output /tmp/techdesk-admin-users.json --write-out '%{http_code}' \
  --request GET "$BASE_URL/api/admin/users" \
  --cookie "$auth_cookie")
assert_status 403 "$status"
grep -q 'FORBIDDEN' /tmp/techdesk-admin-users.json

status=$(curl --silent --output /tmp/techdesk-delete-customer.json --write-out '%{http_code}' \
  --request DELETE "$BASE_URL/api/customers/00000000-0000-0000-0000-000000000000" \
  --cookie "$auth_cookie")
assert_status 403 "$status"
grep -q 'FORBIDDEN' /tmp/techdesk-delete-customer.json

status=$(curl --silent --output /tmp/techdesk-delete-equipment.json --write-out '%{http_code}' \
  --request DELETE "$BASE_URL/api/equipment/00000000-0000-0000-0000-000000000000" \
  --cookie "$auth_cookie")
assert_status 403 "$status"
grep -q 'FORBIDDEN' /tmp/techdesk-delete-equipment.json

status=$(curl --silent --output /tmp/techdesk-delete-order.json --write-out '%{http_code}' \
  --request DELETE "$BASE_URL/api/orders/999999999" \
  --cookie "$auth_cookie")
assert_status 403 "$status"
grep -q 'FORBIDDEN' /tmp/techdesk-delete-order.json

echo 'Security regression checks passed.'
