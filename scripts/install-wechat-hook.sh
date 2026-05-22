#!/bin/bash
# 一键安装 tmux-agent 的 WeChat 通知 hook 到 Claude Code。
#
# Usage:
#   ./scripts/install-wechat-hook.sh [WEBHOOK_URL]
#   WECOM_WEBHOOK_URL=https://... ./scripts/install-wechat-hook.sh
#
# 不传 URL 也不在 env → 交互输入。已有 .env 不传 URL → 复用现有。

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/docs/notify_wechat.sh"
HOOK_DIR="$HOME/.claude/hooks"
HOOK_SH="$HOOK_DIR/notify_wechat.sh"
HOOK_ENV="$HOOK_DIR/notify_wechat.env"
SETTINGS="$HOME/.claude/settings.json"

if ! command -v jq > /dev/null; then
  echo "ERR: jq is required. Install with: sudo apt install jq" >&2
  exit 1
fi
if [ ! -f "$TEMPLATE" ]; then
  echo "ERR: template not found: $TEMPLATE" >&2
  exit 1
fi

# --- 1. 拿 URL ---
URL="${1:-${WECOM_WEBHOOK_URL:-}}"
if [ -z "$URL" ] && [ -f "$HOOK_ENV" ]; then
  URL=$(grep -oP 'WECOM_WEBHOOK_URL="\K[^"]+' "$HOOK_ENV" || true)
fi
if [ -z "$URL" ]; then
  read -rp "WeCom webhook URL: " URL
fi
if [ -z "$URL" ]; then
  echo "ERR: webhook URL required (pass as arg / env / interactively)" >&2
  exit 1
fi
if ! echo "$URL" | grep -q '^https://qyapi.weixin.qq.com/'; then
  echo "WARN: URL doesn't look like a WeCom webhook (no qyapi.weixin.qq.com), proceeding anyway" >&2
fi

# --- 2. cp 脚本 + 写 .env ---
mkdir -p "$HOOK_DIR"
cp "$TEMPLATE" "$HOOK_SH"
chmod +x "$HOOK_SH"
cat > "$HOOK_ENV" <<EOF
# WeCom (Enterprise WeChat) webhook URL. Managed by install-wechat-hook.sh.
# Do not commit this file.
WECOM_WEBHOOK_URL="$URL"
EOF
chmod 600 "$HOOK_ENV"
echo "[ok] hook: $HOOK_SH"
echo "[ok] env:  $HOOK_ENV"

# --- 3. 注册到 settings.json (幂等) ---
if [ ! -f "$SETTINGS" ]; then
  echo '{}' > "$SETTINGS"
fi

TMP="$(mktemp "${SETTINGS}.XXXXXX")"
jq --arg cmd "bash $HOOK_SH" '
  .hooks //= {} |
  .hooks.Stop //= [] |
  .hooks.PermissionRequest //= [] |
  # Stop hook: matcher="" 单 entry
  (if (.hooks.Stop | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.Stop += [{"matcher":"", "hooks":[{"type":"command","command":$cmd}]}]
   else . end) |
  # PermissionRequest hook: matcher=".*"
  (if (.hooks.PermissionRequest | map(select(.hooks[]?.command == $cmd)) | length) == 0
   then .hooks.PermissionRequest += [{"matcher":".*", "hooks":[{"type":"command","command":$cmd}]}]
   else . end)
' "$SETTINGS" > "$TMP" && mv "$TMP" "$SETTINGS"

echo "[ok] settings: $SETTINGS"
echo
echo "Done. Trigger any Claude turn to test (the next 'Stop' will fire the hook)."
