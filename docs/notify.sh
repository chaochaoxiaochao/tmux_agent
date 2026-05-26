#!/bin/bash
# Forward Claude Code hook events to tmux-agent for channel fanout.
# All markdown / card / channel routing live on the server side.

ENV_FILE="$(dirname "$0")/notify.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"
TMUX_AGENT_URL="${TMUX_AGENT_URL:-http://127.0.0.1:7681}"

json_input=$(cat)

# Stop event + 有 running background task → 跳过 (跟旧脚本行为一致)
if [ "$(echo "$json_input" | jq -r '.hook_event_name // ""')" = "Stop" ]; then
  running_bg=$(echo "$json_input" | jq -r '[.background_tasks[]? | select(.status=="running")] | length')
  if [ "${running_bg:-0}" -gt 0 ]; then
    exit 0
  fi
fi

# 解析 tmux pane → session/windowId (server 也能拿,但这里冗余传一下保险)
TMUX_S=""
TMUX_W=""
if [ -n "$TMUX_PANE" ]; then
  target=$(tmux display-message -p -t "$TMUX_PANE" '#{session_name},#{window_id}' 2>/dev/null)
  TMUX_S="${target%%,*}"
  TMUX_W="${target##*,}"
fi

# 富化 payload, 透传给 server
payload=$(echo "$json_input" | jq --arg pane "$TMUX_PANE" --arg s "$TMUX_S" --arg w "$TMUX_W" \
  '. + {paneId: $pane, session: $s, windowId: $w}')

# 单次 POST, 失败静默, 不阻塞 hook chain
curl -sX POST "$TMUX_AGENT_URL/api/notify" \
  -H 'content-type: application/json' \
  --max-time 3 -d "$payload" > /dev/null 2>&1 &
