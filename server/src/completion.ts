import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

export interface FileEntry { path: string; mtime: number }

export function filterAndRank(files: FileEntry[], q: string): FileEntry[] {
  const ql = q.toLowerCase();
  const out = ql ? files.filter(f => f.path.toLowerCase().includes(ql)) : files.slice();
  out.sort((a, b) => b.mtime - a.mtime);
  return out.slice(0, 50);
}

export async function listFilesIn(cwd: string, timeoutMs = 500): Promise<FileEntry[]> {
  if (!fs.existsSync(cwd)) return [];
  for (const tool of ['fd', 'rg']) {
    try {
      const args = tool === 'fd' ? ['--type', 'f', '.', cwd] : ['--files', cwd];
      const { stdout } = await execFileP(tool, args, { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 });
      const lines = stdout.split('\n').filter(Boolean);
      return lines.map(p => {
        const abs = path.isAbsolute(p) ? p : path.join(cwd, p);
        let mtime = 0;
        try { mtime = fs.statSync(abs).mtimeMs; } catch { }
        return { path: path.relative(cwd, abs), mtime };
      });
    } catch { /* try next */ }
  }
  return fsFallback(cwd, 3, 200);
}

function fsFallback(root: string, maxDepth: number, limit: number): FileEntry[] {
  const out: FileEntry[] = [];
  function walk(dir: string, depth: number) {
    if (out.length >= limit || depth > maxDepth) return;
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= limit) return;
      if (e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, depth + 1);
      else if (e.isFile()) {
        let m = 0; try { m = fs.statSync(full).mtimeMs; } catch { }
        out.push({ path: path.relative(root, full), mtime: m });
      }
    }
  }
  walk(root, 0);
  return out;
}

export function isPathSafe(cwd: string, root: string): boolean {
  const rel = path.relative(root, cwd);
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}
