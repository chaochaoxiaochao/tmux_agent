import type { Button, FileItem, SessionMeta, UiConfig, WindowMeta } from './types';

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
  clearAttention: (session: string, windowId: string) =>
    http<void>('POST', '/api/notify/clear', { session, windowId }),
  sendKey: (session: string, id: string, key: string) =>
    http<void>('POST', `${wbase(session)}/${enc(id)}/key`, { key }),

  // buttons (global)
  buttons: () => http<Button[]>('GET', '/api/buttons'),
  createButton: (b: Omit<Button, 'id'>) => http<Button>('POST', '/api/buttons', b),
  updateButton: (id: string, b: Partial<Button>) => http<Button>('PUT', `/api/buttons/${id}`, b),
  deleteButton: (id: string) => http<void>('DELETE', `/api/buttons/${id}`),

  // completion + config
  files: (q: string) => http<FileItem[]>('GET', `/api/files?q=${enc(q)}`),
  commands: (q: string) =>
    http<{ kind: 'command'; name: string; hint: string; payload: string }[]>('GET', `/api/commands?q=${enc(q)}`),
  config: () => http<UiConfig>('GET', '/api/config'),
};
