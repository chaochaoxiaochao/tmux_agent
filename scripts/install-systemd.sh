#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_BIN="$(command -v node)" || { echo "node not in PATH"; exit 1; }
command -v tmux >/dev/null || { echo "tmux not in PATH; install via apt/brew first"; exit 1; }

UNIT_DIR="$HOME/.config/systemd/user"
UNIT="$UNIT_DIR/tmux-agent.service"
mkdir -p "$UNIT_DIR"

cat > "$UNIT" <<EOF
[Unit]
Description=tmux-agent (web UI for tmux)
After=default.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$NODE_BIN $ROOT/server/dist/main.js
Restart=on-failure
RestartSec=2

[Install]
WantedBy=default.target
EOF

# build first
( cd "$ROOT" && npm install && npm run build )

systemctl --user daemon-reload
systemctl --user enable --now tmux-agent.service

echo "done. Check status: systemctl --user status tmux-agent"
echo "Logs: journalctl --user -u tmux-agent -f"
