import { FastifyInstance } from 'fastify';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { expandHome } from '../config.js';

// Upload root: ~/.local/share/tmux-agent/uploads. Files land under
// <root>/<session>/<windowId>/<timestamp>-<sanitized-name>. We hand the absolute
// path back to the web client, which prepends `@<path>` to the next send-keys
// so Claude Code (or any tool that understands @-mentions) picks it up.
const UPLOAD_ROOT_REL = '~/.local/share/tmux-agent/uploads';
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB per file
// Base64 expands ~4/3, plus JSON wrapping. Give some headroom.
const MAX_REQUEST_BYTES = 32 * 1024 * 1024;

function uploadRoot(): string {
  return expandHome(UPLOAD_ROOT_REL);
}

function sanitizeName(name: string): string {
  const cleaned = name
    .replace(/[/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 200);
  return cleaned || 'upload';
}

// session and windowId come from the URL of the actual tmux pane; we still
// sanitize because they could in theory contain slashes/dots.
function sanitizeSegment(seg: string): string {
  return seg.replace(/[^A-Za-z0-9._@-]/g, '_').slice(0, 80) || 'x';
}

function estimateBase64Bytes(b64: string): number {
  const len = b64.length;
  if (!len) return 0;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((len * 3) / 4) - pad;
}

function isInsideRoot(target: string): boolean {
  const root = path.resolve(uploadRoot());
  const t = path.resolve(target);
  return t === root || t.startsWith(root + path.sep);
}

export async function registerUploadRoutes(app: FastifyInstance) {
  // Per-route body limit override; default 1MB is too small for base64 of 20MB.
  app.post<{
    Params: { session: string; id: string };
    Body: { filename: string; mimeType: string; content: string };
  }>(
    '/api/sessions/:session/windows/:id/upload',
    { bodyLimit: MAX_REQUEST_BYTES },
    async (req, reply) => {
      const { session, id } = req.params;
      const { filename, mimeType, content } = req.body ?? ({} as any);

      if (!filename || !content) {
        reply.status(400).send({ error: 'bad_input', message: 'filename and content required' });
        return;
      }
      if (estimateBase64Bytes(content) > MAX_UPLOAD_BYTES) {
        reply.status(413).send({ error: 'too_large', message: `file exceeds ${MAX_UPLOAD_BYTES} bytes` });
        return;
      }

      let buf: Buffer;
      try {
        buf = Buffer.from(content, 'base64');
      } catch {
        reply.status(400).send({ error: 'bad_base64', message: 'content is not valid base64' });
        return;
      }
      if (buf.length > MAX_UPLOAD_BYTES) {
        reply.status(413).send({ error: 'too_large', message: `file exceeds ${MAX_UPLOAD_BYTES} bytes` });
        return;
      }

      const dir = path.join(uploadRoot(), sanitizeSegment(session), sanitizeSegment(id));
      await mkdir(dir, { recursive: true });
      const unique = `${Date.now()}-${sanitizeName(filename)}`;
      const filePath = path.join(dir, unique);
      await writeFile(filePath, buf);

      return { path: filePath, mimeType: mimeType ?? 'application/octet-stream', size: buf.length };
    },
  );

  app.delete<{ Querystring: { path?: string } }>(
    '/api/upload',
    async (req, reply) => {
      const target = (req.query.path ?? '').trim();
      if (!target) {
        reply.status(400).send({ error: 'bad_input', message: 'path required' });
        return;
      }
      if (!isInsideRoot(target)) {
        reply.status(403).send({ error: 'forbidden', message: 'path outside upload root' });
        return;
      }
      try {
        await rm(target, { force: true });
      } catch {
        // best effort
      }
      reply.status(204).send();
    },
  );
}
