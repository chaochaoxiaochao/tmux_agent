#!/bin/bash
# 企业微信通知 Hook - 当 Claude Code 发送通知时，同步推送到企业微信，
# 同时通知 tmux-agent 让对应 window 在 wall 上闪烁。
#
# Install: run scripts/install-wechat-hook.sh — it copies this script to ~/.claude/hooks/ and writes notify_wechat.env with your webhook URL.

# Source webhook URL from external env file (see scripts/install-wechat-hook.sh).
ENV_FILE="$(dirname "$0")/notify_wechat.env"
if [ -f "$ENV_FILE" ]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
fi
if [ -z "$WECOM_WEBHOOK_URL" ]; then
  echo "ERR: WECOM_WEBHOOK_URL not set in $ENV_FILE — run scripts/install-wechat-hook.sh" >&2
  exit 0
fi

json_input=$(cat)

# Debug: log every hook invocation so we can see what Claude actually sends.
# 默认关闭;要排查时改成 1 再开。
DEBUG_AUDIT=0
if [ "$DEBUG_AUDIT" = "1" ]; then
  LOG=/tmp/claude-hook-debug.log
  {
    echo "=== $(date '+%Y-%m-%d %H:%M:%S.%3N') ==="
    echo "$json_input"
    echo
  } >> "$LOG"
fi

message=$(echo "$json_input" | jq -r '.message')
title=$(echo "$json_input" | jq -r '.title')
session_id=$(echo "$json_input" | jq -r '.session_id')
cwd=$(echo "$json_input" | jq -r '.cwd')
hook_event_name=$(echo "$json_input" | jq -r '.hook_event_name')
notification_type=$(echo "$json_input" | jq -r '.notification_type // ""')
tool_name=$(echo "$json_input" | jq -r '.tool_name // ""')

# 本脚本设计支持 3 类事件,对应 settings.json 里的 3 个 hook 入口:
#   - Stop              + matcher=""    (Claude 每个 turn 结束)
#   - PermissionRequest + matcher=".*"  (Claude Code 实际处理"需要用户决定"的事件;
#                                        覆盖 AskUserQuestion(Claude 主动问) +
#                                        工具权限审批(Edit out-of-workspace / 未 allowlist 的 Bash 等)。
#                                        脚本内部按 tool_name 分文案。)
#   - Notification + matcher="permission_prompt"    (内置工具的 notification,实际很少触发,备用)
#
# 注意:不要再加 PreToolUse + AskUserQuestion —— 那会跟 PermissionRequest 重复触发,
# 同一次 ask 收两条微信。PermissionRequest 已经覆盖 AskUserQuestion。

# 反查 session_name:hook payload 没这字段,但 ~/.claude/sessions/<pid>.json 里有,
# 找到 sessionId 匹配那个 (用 /rename 改过会写入 .name);没改过则字段不存在,留空回退用 cwd 末段。
session_name=$(jq -r --arg sid "$session_id" 'select(.sessionId==$sid) | .name // empty' \
  ~/.claude/sessions/*.json 2>/dev/null | head -1)
project_short=$(basename "$cwd")

# 解析当前 tmux pane → session/window-id（用来戳 tmux-agent，也用于 deep link）
TMUX_AGENT_URL="${TMUX_AGENT_URL:-http://127.0.0.1:7681}"
TMUX_S=""
TMUX_W=""
if [ -n "$TMUX_PANE" ]; then
  target=$(tmux display-message -p -t "$TMUX_PANE" '#{session_name},#{window_id}' 2>/dev/null)
  if [ -n "$target" ]; then
    TMUX_S="${target%%,*}"
    TMUX_W="${target##*,}"
  fi
fi

# 从 tmux-agent /api/config 拿外部可访问的 publicUrl，没配就回退本机 URL（手机点不开但消息不会缺）
PUBLIC_URL=$(curl -s "$TMUX_AGENT_URL/api/config" 2>/dev/null | jq -r '.publicUrl // empty')
[ -z "$PUBLIC_URL" ] && PUBLIC_URL="$TMUX_AGENT_URL"

# 拼 deep link（带 hash 路由）。jq -rR 用来 URL-encode 段。
url_encode() { jq -rRn --arg s "$1" '$s|@uri'; }
DEEP_LINK=""
if [ -n "$TMUX_S" ] && [ -n "$TMUX_W" ]; then
  DEEP_LINK="$PUBLIC_URL/#/w/$(url_encode "$TMUX_S")/$(url_encode "$TMUX_W")"
fi

# 组装企微 markdown 消息
WECOM_WEBHOOK="$WECOM_WEBHOOK_URL"
# Session 行: 优先 session_name (用户 /rename 设的);没设则 fallback "<cwd末段>".
session_label="${session_name:-$project_short}"
if [ "$hook_event_name" = "Stop" ]; then
  HEAD="✅ Claude Code 任务完成"
  BODY="主人我完成任务了\n>Session: \`$session_label\`\n>Cwd: \`$cwd\`"
elif [ "$hook_event_name" = "PermissionRequest" ]; then
  # PermissionRequest 涵盖所有"需要用户决定"的场景:工具权限审批 + AskUserQuestion。
  # 按 tool_name 选不同文案,语义更准。
  if [ "$tool_name" = "AskUserQuestion" ]; then
    HEAD="❓ Claude Code 需要询问"
    BODY="主人我需要问你\n>Session: \`$session_label\`\n>Cwd: \`$cwd\`"
  else
    HEAD="🔐 Claude Code 等权限批准"
    BODY="主人我需要你批准 \`$tool_name\` 操作\n>Session: \`$session_label\`\n>Cwd: \`$cwd\`"
  fi
else
  HEAD="🔔 Claude Code 等输入"
  BODY="$message\n>Session: \`$session_label\`\n>Cwd: \`$cwd\`"
fi
LINK_LINE=""
[ -n "$DEEP_LINK" ] && LINK_LINE="\n>[👉 打开 Web 终端]($DEEP_LINK)"

TIME_LINE="\n>Time: \`$(date '+%Y-%m-%d:%H-%M-%S')\`"

# 上报 agent state 到 tmux-agent registry (供 wall agent view 实时显示 + 下面 GET snapshot 能看到本次事件)。
if [ -n "$TMUX_PANE" ]; then
  case "$hook_event_name" in
    Stop) agent_state="stop" ;;
    PermissionRequest|Notification) agent_state="request" ;;
    *) agent_state="" ;;
  esac
  if [ -n "$agent_state" ]; then
    # last_msg ≤80 字。Stop / Notification 走 $message;
    # AskUserQuestion 的问题在 tool_input.questions[0].question;其他 PermissionRequest 都没合适字段,留空。
    last_msg=""
    if [ -n "$message" ] && [ "$message" != "null" ]; then
      last_msg=$(printf '%s' "$message" | head -c 80 | tr '\n' ' ')
    elif [ "$tool_name" = "AskUserQuestion" ]; then
      tool_input=$(echo "$json_input" | jq -c '.tool_input // {}')
      last_msg=$(echo "$tool_input" | jq -r '.questions[0].question // ""' | head -c 80 | tr '\n' ' ')
    fi
    payload=$(jq -n \
      --arg pid "$TMUX_PANE" --arg sess "$TMUX_S" --arg wid "$TMUX_W" \
      --arg csid "$session_id" --arg cwd "$cwd" --arg st "$agent_state" --arg msg "$last_msg" \
      '{paneId:$pid, session:$sess, windowId:$wid, claudeSessionId:$csid, cwd:$cwd, state:$st, lastMessage:$msg}')
    # 同步等 POST 返回再继续。--max-time 2 兜底:server 挂了/网络差最长卡 2s。
    curl -sX POST "$TMUX_AGENT_URL/api/agent-state" \
      -H 'content-type: application/json' \
      --max-time 2 -d "$payload" > /dev/null 2>&1
  fi
fi

# 拉全 agent 快照,按状态分组渲染到正文下半段。
# 失败 / endpoint 404 / 空 registry → AGENTS_SECTION 留空,CONTENT 退化到原样。
AGENTS_SECTION=""
snapshot=$(curl -s --max-time 2 "$TMUX_AGENT_URL/api/agent-state/snapshot" 2>/dev/null)
if [ -n "$snapshot" ]; then
  rendered=$(echo "$snapshot" | jq -r --arg public "$PUBLIC_URL" --arg curpid "$TMUX_PANE" '
    if (.agents | length) == 0 then ""
    else
      .agents
      | group_by(.state)
      | map({state: .[0].state, items: .})
      | sort_by(if .state == "request" then 0 elif .state == "running" then 1 else 2 end)
      | map(
          (if .state == "request" then "⏳ 等输入 (" + (.items | length | tostring) + ")"
            elif .state == "running" then "🟢 跑着 (" + (.items | length | tostring) + ")"
            else "✅ 刚完成 (" + (.items | length | tostring) + ")" end) as $header
          | ["**" + $header + "**"] + (.items | map(
              "- [" + .session + ":" + .windowId + "#" + (.paneIndex | tostring) + "](" + $public + "/#/w/" + (.session | @uri) + "/" + (.windowId | @uri) + ") · " +
              (((now - (.lastEventAt / 1000)) | floor | tostring) + "s") +
              " · `" + (.cwd | split("/") | .[-2:] | join("/")) + "`" +
              (if (.lastMessage // "") != "" then " · \"" + .lastMessage + "\"" else "" end) +
              (if .paneId == $curpid then " ← 本次" else "" end)
            ))
        )
      | flatten
      | join("\n")
    end
  ' 2>/dev/null)
  if [ -n "$rendered" ]; then
    # 每行前面加 > 让企微 markdown 把整段当 quote 显示
    quoted=$(printf '%s' "$rendered" | sed 's/^/>/')
    AGENTS_SECTION=$'\n>\n>────── 当前所有 agents ──────\n'"$quoted"
  fi
fi

CONTENT="## $HEAD\n${BODY}${TIME_LINE}${LINK_LINE}${AGENTS_SECTION}"

curl -s -X POST "$WECOM_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg c "$(printf '%b' "$CONTENT")" '{msgtype:"markdown", markdown:{content:$c}}')" \
  > /dev/null 2>&1

# 通知 tmux-agent 让对应 window tile 闪烁
if [ -n "$TMUX_S" ] && [ -n "$TMUX_W" ]; then
  if [ "$hook_event_name" = "Stop" ]; then
    kind="done"
  else
    kind="input-needed"
  fi
  curl -sX POST "$TMUX_AGENT_URL/api/notify" \
    -H 'content-type: application/json' \
    -d "{\"session\":\"$TMUX_S\",\"windowId\":\"$TMUX_W\",\"kind\":\"$kind\"}" \
    > /dev/null 2>&1 &
fi
