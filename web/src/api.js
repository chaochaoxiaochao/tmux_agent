async function http(method, url, body) {
    const res = await fetch(url, {
        method,
        headers: body ? { 'content-type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204)
        return undefined;
    if (!res.ok) {
        const e = await res.json().catch(() => ({ error: 'http', message: res.statusText }));
        throw new Error(e.message ?? 'http error');
    }
    return res.json();
}
const enc = encodeURIComponent;
const wbase = (s) => `/api/sessions/${enc(s)}/windows`;
export const api = {
    // sessions
    sessions: () => http('GET', '/api/sessions'),
    createSession: (name) => http('POST', '/api/sessions', { name }),
    // windows (per-session)
    windows: (session) => http('GET', wbase(session)),
    newWindow: (session, name) => http('POST', wbase(session), { name }),
    killWindow: (session, id) => http('POST', `${wbase(session)}/${enc(id)}/kill`),
    splitWindow: (session, id, dir) => http('POST', `${wbase(session)}/${enc(id)}/split`, { dir }),
    killAll: (session) => http('POST', `${wbase(session)}/kill-all`),
    send: (session, id, text) => http('POST', `${wbase(session)}/${enc(id)}/send`, { text }),
    copyMode: (session, id) => http('POST', `${wbase(session)}/${enc(id)}/copy-mode`),
    clearAttention: (session, windowId) => http('POST', '/api/notify/clear', { session, windowId }),
    sendKey: (session, id, key) => http('POST', `${wbase(session)}/${enc(id)}/key`, { key }),
    // buttons (global)
    buttons: () => http('GET', '/api/buttons'),
    createButton: (b) => http('POST', '/api/buttons', b),
    updateButton: (id, b) => http('PUT', `/api/buttons/${id}`, b),
    deleteButton: (id) => http('DELETE', `/api/buttons/${id}`),
    // completion + config
    files: (q) => http('GET', `/api/files?q=${enc(q)}`),
    commands: (q) => http('GET', `/api/commands?q=${enc(q)}`),
    config: () => http('GET', '/api/config'),
};
