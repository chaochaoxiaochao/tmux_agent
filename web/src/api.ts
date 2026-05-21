import type { Button, FileItem, SessionMeta, UiConfig, UploadResult, WindowMeta } from './types';

async function http<T>(method: string, url: string, body?: any): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const e = await res.json().catch(() => ({ error: 'http', message: res.statusText }));
    throw new Error(e.message ?? 'http error');
  }
  return res.json();
}

const enc = encodeURIComponent;
const wbase = (s: string) => `/api/sessions/${enc(s)}/windows`;

export const api = {
  // sessions
  sessions: () => http<SessionMeta[]>('GET', '/api/sessions'),
  createSession: (name: string) => http<void>('POST', '/api/sessions', { name }),

  // windows (per-session)
  windows: (session: string) => http<WindowMeta[]>('GET', wbase(session)),
  newWindow: (session: string, name?: string) => http<WindowMeta>('POST', wbase(session), { name }),
  killWindow: (session: string, id: string) => http<void>('POST', `${wbase(session)}/${enc(id)}/kill`),
  splitWindow: (session: string, id: string, dir: 'h' | 'v') =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/split`, { dir }),
  killAll: (session: string) => http<void>('POST', `${wbase(session)}/kill-all`),
  send: (session: string, id: string, text: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/send`, { text }),
  copyMode: (session: string, id: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/copy-mode`),
  panes: (session: string, id: string) =>
    http<{ id: string; index: number; active: boolean; size: string; cmd: string }[]>(
      'GET', `${wbase(session)}/${enc(id)}/panes`),
  selectPane: (session: string, id: string, pane: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/panes/${enc(pane)}/select`),
  zoomPane: (session: string, id: string, pane: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/panes/${enc(pane)}/zoom`),
  ensureZoomed: (session: string, id: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/ensure-zoom`),
  clearAttention: (session: string, windowId: string) =>
    http<void>('POST', '/api/notify/clear', { session, windowId }),
  sendKey: (session: string, id: string, key: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/key`, { key }),

  // buttons (global)
  buttons: () => http<Button[]>('GET', '/api/buttons'),
  createButton: (b: Omit<Button, 'id'>) => http<Button>('POST', '/api/buttons', b),
  updateButton: (id: string, b: Partial<Button>) => http<Button>('PUT', `/api/buttons/${id}`, b),
  deleteButton: (id: string) => http<void>('DELETE', `/api/buttons/${id}`),

  // uploads
  upload: (session: string, id: string, filename: string, mimeType: string, content: string) =>
    http<UploadResult>('POST', `${wbase(session)}/${enc(id)}/upload`, { filename, mimeType, content }),
  deleteUpload: (filePath: string) =>
    http<void>('DELETE', `/api/upload?path=${enc(filePath)}`),

  // completion + config
  files: (q: string) => http<FileItem[]>('GET', `/api/files?q=${enc(q)}`),
  config: () => http<UiConfig>('GET', '/api/config'),
};
