# Start the E-Votex named Cloudflare Tunnel (stable URL for WebAuthn).
# Prerequisites: cloudflared tunnel login, create, route dns (see commands below).
# Edit .cloudflared/config.yml: replace USER_TUNNEL_ID_PLACEHOLDER and hostname.

$configPath = Join-Path $PSScriptRoot "..\.cloudflared\config.yml" | Resolve-Path
Write-Host "Using config: $configPath" -ForegroundColor Cyan
Write-Host "App URL: https://evotex.evotex.com" -ForegroundColor Yellow
npx cloudflared@latest tunnel --config $configPath --no-autoupdate run evotex
