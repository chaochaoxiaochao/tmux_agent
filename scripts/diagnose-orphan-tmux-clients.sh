#!/usr/bin/env bash
# Diagnose orphan tmux clients (read-only).
#
# A tmux client becomes "orphan" when its controlling pty is destroyed
# (e.g. ssh session ended, ws bridge crashed) but the client process
# itself keeps running and exchanging heartbeats with tmux server. The
# server may then burn ~100% CPU redrawing for a peer nobody is watching.
#
# This script never kills anything. It lists every tmux client process
# on the host and prints, for each one:
#   - whether its stdin/stdout points at a deleted pty
#   - the tmux server pid it talks to + that server's CPU%
#   - kernel stack hint, parent pid, age
#
# Run as the user that owns the tmux session. If pty info needs root,
# re-run with sudo for the deepest details.

set -u

bold() { printf '\033[1m%s\033[0m' "$*"; }
red()  { printf '\033[31m%s\033[0m' "$*"; }
grn()  { printf '\033[32m%s\033[0m' "$*"; }
ylw()  { printf '\033[33m%s\033[0m' "$*"; }

# --- collect tmux client pids -------------------------------------------------
mapfile -t client_pids < <(
  # `comm` is the kernel-set process name; tmux sets it to "tmux: client"
  # (truncated to 15 chars on Linux). argv[0] is unreliable here — it's
  # the original command line like "tmux attach -t foo".
  ps -eo pid,comm= --no-headers \
    | awk '/[[:space:]]tmux:[[:space:]]*client/ {print $1}'
)

if [[ ${#client_pids[@]} -eq 0 ]]; then
  echo "No live tmux client processes on this host."
  exit 0
fi

printf '%s %s\n' "$(bold "Found")" "${#client_pids[@]} tmux client process(es)."
echo

orphan_count=0
for pid in "${client_pids[@]}"; do
  if [[ ! -r /proc/$pid/status ]]; then
    # Can't read this pid (different uid, no sudo). Skip with a marker.
    printf '  pid=%s %s\n' "$pid" "$(ylw '[unreadable — different uid? rerun with sudo]')"
    continue
  fi

  cmd=$(tr '\0' ' ' < "/proc/$pid/cmdline")
  ppid=$(awk '/^PPid:/ {print $2}' "/proc/$pid/status")
  state=$(awk '/^State:/ {print $2}' "/proc/$pid/status")
  start=$(ps -o lstart= -p "$pid" 2>/dev/null | sed 's/^ *//')
  elapsed=$(ps -o etime= -p "$pid" 2>/dev/null | sed 's/^ *//')

  # Resolve stdin/stdout/stderr targets. "(deleted)" is the smoking gun.
  fd_targets=$(ls -l "/proc/$pid/fd/0" "/proc/$pid/fd/1" "/proc/$pid/fd/2" 2>/dev/null \
               | awk '{print $NF}' | sort -u | tr '\n' '|' | sed 's/|$//')

  is_orphan=no
  if [[ "$fd_targets" == *"(deleted)"* ]]; then
    is_orphan=yes
    orphan_count=$((orphan_count + 1))
  fi

  # Find which tmux server this client talks to via its unix socket peer.
  # Strategy: for each socket fd this client owns, grab its inode, find the
  # row in `ss -xp` whose owner is this pid+fd, read the peer inode from
  # that row, then find the row whose owner has the peer inode and parse
  # its pid out of the users=(...) field.
  server_pid=""
  server_cpu=""
  ss_dump=$(ss -xp 2>/dev/null)
  for f in /proc/$pid/fd/*; do
    tgt=$(readlink "$f" 2>/dev/null) || continue
    [[ $tgt == socket:\[*\] ]] || continue
    inode=${tgt#socket:[}; inode=${inode%]}
    # ss columns for unix sockets:
    #   1 type, 2 state, 3 recv-q, 4 send-q, 5 local-addr, 6 self-inode,
    #   7 peer-addr, 8 peer-inode, 9+ users:((...))
    # Step 1: find the row whose self-inode (col 6) is our fd inode → peer in col 8.
    peer_inode=$(awk -v ino="$inode" '$6==ino {print $8; exit}' <<<"$ss_dump")
    [[ -z "$peer_inode" || "$peer_inode" == "0" ]] && continue
    # Step 2: find the row whose self-inode (col 6) equals peer_inode → owner pid.
    cand=$(awk -v ino="$peer_inode" '$6==ino {print; exit}' <<<"$ss_dump" \
           | grep -oE 'pid=[0-9]+' | head -1 | cut -d= -f2)
    # Skip if peer resolves back to ourselves (shouldn't happen, defensive).
    [[ "$cand" == "$pid" ]] && cand=""
    [[ -n "$cand" ]] && { server_pid=$cand; break; }
  done

  if [[ -n "$server_pid" && -r /proc/$server_pid/stat ]]; then
    server_cpu=$(top -b -n 1 -p "$server_pid" 2>/dev/null \
                 | awk -v p="$server_pid" '$1==p {print $9}')
  fi

  if [[ $is_orphan == yes ]]; then
    label=$(red "ORPHAN")
  else
    label=$(grn "ok    ")
  fi

  printf '  %s pid=%-7s ppid=%-5s state=%s age=%-12s cmd=%s\n' \
    "$label" "$pid" "$ppid" "$state" "$elapsed" "$cmd"
  printf '            started: %s\n' "$start"
  printf '            stdio  : %s\n' "$fd_targets"
  if [[ -n "$server_pid" ]]; then
    printf '            server : pid=%s cpu=%s%%\n' "$server_pid" "${server_cpu:-?}"
  else
    printf '            server : %s\n' "$(ylw 'could not resolve (try with sudo)')"
  fi
  if [[ -r /proc/$pid/wchan ]]; then
    wchan=$(cat /proc/$pid/wchan 2>/dev/null)
    printf '            wchan  : %s\n' "${wchan:-(running)}"
  fi
  echo
done

echo "------------------------------------------------------------"
if [[ $orphan_count -gt 0 ]]; then
  printf '%s %d orphan tmux client(s) detected.\n' "$(red 'WARN:')" "$orphan_count"
  echo "These are likely the cause of any 100%-CPU tmux server you see."
  echo "To clean up safely, prefer tmux's own detach over kill:"
  echo "    tmux -S <socket> detach-client -s <session>     # detach all"
  echo "    tmux -S <socket> detach-client -t <client_tty>  # one client"
  echo "Only fall back to 'kill <pid>' if detach-client cannot reach the orphan."
  exit 1
else
  printf '%s no orphan clients.\n' "$(grn 'OK:')"
fi
