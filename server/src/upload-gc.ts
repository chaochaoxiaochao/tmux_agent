import { readdir, stat, rm, rmdir } from 'node:fs/promises';
import * as path from 'node:path';
import { expandHome } from './config.js';

const UPLOAD_ROOT_REL = '~/.local/share/tmux-agent/uploads';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;   // 7 days
const SWEEP_INTERVAL_MS = 24 * 60 * 60 * 1000;  // 24 hours

interface SweepResult { filesDeleted: number; dirsRemoved: number; errors: number }

/**
 * Recursively sweep dir, delete files with mtime > MAX_AGE_MS.
 * After all files are deleted from a directory, attempt to rmdir parent dirs.
 */
async function sweepDir(dir: string, now: number, res: SweepResult): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await sweepDir(full, now, res);
      // After recursion, try to rmdir if empty
      try {
        await rmdir(full);
        res.dirsRemoved++;
      } catch {
        // Non-empty or permission error, ignore
      }
    } else if (e.isFile()) {
      try {
        const st = await stat(full);
        if (now - st.mtimeMs > MAX_AGE_MS) {
          await rm(full, { force: true });
          res.filesDeleted++;
        }
      } catch {
        res.errors++;
      }
    }
  }
}

export async function sweepUploadsOnce(): Promise<SweepResult> {
  const root = expandHome(UPLOAD_ROOT_REL);
  const res: SweepResult = { filesDeleted: 0, dirsRemoved: 0, errors: 0 };
  await sweepDir(root, Date.now(), res);
  return res;
}

let timer: ReturnType<typeof setInterval> | null = null;

/**
 * Start GC: sweep once on boot, then every 24h.
 * Returns stop function (for tests or graceful shutdown).
 */
export function startUploadGc(log: (msg: string) => void = () => {}): () => void {
  const run = () => {
    sweepUploadsOnce()
      .then(r => {
        if (r.filesDeleted || r.dirsRemoved || r.errors) {
          log(`[upload-gc] deleted ${r.filesDeleted} file(s), ${r.dirsRemoved} dir(s), ${r.errors} error(s)`);
        }
      })
      .catch(e => log(`[upload-gc] failed: ${e?.message ?? e}`));
  };
  // Run async on boot, don't block server startup
  run();
  timer = setInterval(run, SWEEP_INTERVAL_MS);
  return () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
