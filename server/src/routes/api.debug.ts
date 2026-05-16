import { FastifyInstance } from 'fastify';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { expandHome } from '../config.js';

// Diagnostic dump endpoint — the 🐞 button in AttachedView posts the
// client-side ring buffer here when the user is looking at a glitch
// (e.g. garbled lines on mobile). We just persist it; there's no rate
// limit and no auth, matching the rest of this LAN-only app.
const DUMP_ROOT_REL = '~/.local/share/tmux-agent/debug';

function sanitize(seg: string): string {
  return (seg || 'x').replace(/[^A-Za-z0-9._@-]/g, '_').slice(0, 80) || 'x';
}

export async function registerDebugRoutes(app: FastifyInstance) {
  app.post<{ Body: any }>(
    '/api/debug-dump',
    { bodyLimit: 2 * 1024 * 1024 },
    async (req, reply) => {
      const body = (req.body ?? {}) as any;
      const session = sanitize(String(body.session ?? 'unknown'));
      const windowId = sanitize(String(body.windowId ?? 'unknown'));
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const root = expandHome(DUMP_ROOT_REL);
      await mkdir(root, { recursive: true });
      const file = path.join(root, `${session}-${windowId}-${stamp}.json`);
      await writeFile(file, JSON.stringify(body, null, 2));
      app.log.info({ file }, 'debug dump written');
      return { path: file };
    },
  );
}
