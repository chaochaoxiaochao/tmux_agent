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

export const api = {
  sessions: () => http<SessionMeta[]>('GET', '/api/sessions'),
  createSession: (name: string) => http<void>('POST', '/api/sessions', { name }),
  windows: () => http<WindowMeta[]>('GET', '/api/windows'),
  newWindow: (name?: string) => http<WindowMeta>('POST', '/api/windows', { name }),
  killWindow: (id: string) => http<void>('POST', `/api/windows/${encodeURIComponent(id)}/kill`),
  splitWindow: (id: string, dir: 'h' | 'v') => http<void>('POST', `/api/windows/${encodeURIComponent(id)}/split`, { dir }),
  killAll: () => http<void>('POST', '/api/windows/kill-all'),
  send: (id: string, text: string) => http<void>('POST', `/api/windows/${encodeURIComponent(id)}/send`, { text }),
  buttons: () => http<Button[]>('GET', '/api/buttons'),
  createButton: (b: Omit<Button, 'id'>) => http<Button>('POST', '/api/buttons', b),
  updateButton: (id: string, b: Partial<Button>) => http<Button>('PUT', `/api/buttons/${id}`, b),
  deleteButton: (id: string) => http<void>('DELETE', `/api/buttons/${id}`),
  files: (q: string) => http<FileItem[]>('GET', `/api/files?q=${encodeURIComponent(q)}`),
  commands: (q: string) => http<{ kind: 'command'; name: string; hint: string; payload: string }[]>('GET', `/api/commands?q=${encodeURIComponent(q)}`),
  config: () => http<UiConfig>('GET', '/api/config'),
};
