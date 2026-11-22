#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: scripts/smoke-production.sh <public-domain>" >&2
  exit 2
}

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

[[ $# -eq 1 ]] || usage
DOMAIN="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]')"

if [[ ! "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]; then
  fail "Pass a public DNS hostname only; schemes, ports, paths, IP addresses, and localhost are not accepted."
fi

command -v curl >/dev/null || fail "curl is required."
command -v node >/dev/null || fail "Node.js is required to validate OAuth metadata JSON."

HTTP_RESULT="$(curl --silent --show-error --max-time 15 --output /dev/null \
  --write-out '%{http_code} %{redirect_url}' "http://${DOMAIN}/")" \
  || fail "Could not reach http://${DOMAIN}/ on port 80. Check DNS, firewall, and Caddy."
HTTP_STATUS="${HTTP_RESULT%% *}"
REDIRECT_URL="${HTTP_RESULT#* }"
if [[ "$HTTP_STATUS" != "301" && "$HTTP_STATUS" != "308" ]]; then
  fail "HTTP port 80 did not return a permanent HTTPS redirect (status ${HTTP_STATUS})."
fi
if [[ "$REDIRECT_URL" != "https://${DOMAIN}/"* ]]; then
  fail "HTTP redirected to an unexpected destination: ${REDIRECT_URL}"
fi
echo "PASS: HTTP redirects to HTTPS."

# curl verifies the certificate chain and hostname by default; never add --insecure here.
HEALTH_JSON="$(curl --fail --silent --show-error --max-time 20 \
  "https://${DOMAIN}/api/healthz")" \
  || fail "HTTPS or the database-backed application health endpoint failed."
if ! printf '%s' "$HEALTH_JSON" | node -e '
  let body = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { body += chunk; });
  process.stdin.on("end", () => {
    try {
      if (JSON.parse(body).status !== "ok") process.exitCode = 1;
    } catch {
      process.exitCode = 1;
    }
  });
'; then
  fail "The health endpoint did not return {\"status\":\"ok\"}."
fi
echo "PASS: Trusted TLS and database-backed app health."

RESOURCE_URL="https://${DOMAIN}/api/mcp"
RESOURCE_METADATA="$(curl --fail --silent --show-error --max-time 20 \
  "https://${DOMAIN}/.well-known/oauth-protected-resource/api/mcp")" \
  || fail "MCP protected-resource metadata was not reachable over HTTPS."
if ! printf '%s' "$RESOURCE_METADATA" | EXPECTED_RESOURCE="$RESOURCE_URL" node -e '
    let body = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { body += chunk; });
    process.stdin.on("end", () => {
      try {
        if (JSON.parse(body).resource !== process.env.EXPECTED_RESOURCE) process.exitCode = 1;
      } catch {
        process.exitCode = 1;
      }
    });
  '; then
  fail "OAuth protected-resource metadata does not advertise the expected MCP URL."
fi
echo "PASS: MCP protected-resource metadata matches https://${DOMAIN}/api/mcp."
echo "NOTE: This smoke does not validate signup, OAuth consent, tool calls, or Claude/ChatGPT client compatibility."
