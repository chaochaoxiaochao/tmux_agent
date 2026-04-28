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
export const api = {
    sessions: () => http('GET', '/api/sessions'),
    windows: () => http('GET', '/api/windows'),
    newWindow: (name) => http('POST', '/api/windows', { name }),
    killWindow: (id) => http('POST', `/api/windows/${encodeURIComponent(id)}/kill`),
    splitWindow: (id, dir) => http('POST', `/api/windows/${encodeURIComponent(id)}/split`, { dir }),
    killAll: () => http('POST', '/api/windows/kill-all'),
    send: (id, text) => http('POST', `/api/windows/${encodeURIComponent(id)}/send`, { text }),
    buttons: () => http('GET', '/api/buttons'),
    createButton: (b) => http('POST', '/api/buttons', b),
    updateButton: (id, b) => http('PUT', `/api/buttons/${id}`, b),
    deleteButton: (id) => http('DELETE', `/api/buttons/${id}`),
    files: (q) => http('GET', `/api/files?q=${encodeURIComponent(q)}`),
    commands: (q) => http('GET', `/api/commands?q=${encodeURIComponent(q)}`),
    config: () => http('GET', '/api/config'),
};
