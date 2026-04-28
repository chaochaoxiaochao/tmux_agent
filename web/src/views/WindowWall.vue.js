import { onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ReconnectingWS } from '../ws';
import { api } from '../api';
const snap = ref(null);
const status = ref('connecting');
const router = useRouter();
const newSessionName = ref('claude');
const wsUrl = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws/wall`;
let ws = null;
onMounted(() => {
    ws = new ReconnectingWS(wsUrl, {
        onStatus: s => status.value = s,
        onMessage: msg => {
            if (msg?.type === 'snapshot')
                snap.value = msg.payload;
        },
    });
});
onUnmounted(() => ws?.close());
function open(session, w) {
    router.push(`/w/${encodeURIComponent(session)}/${encodeURIComponent(w.id)}`);
}
async function createSession() {
    if (!newSessionName.value)
        return;
    try {
        await api.createSession(newSessionName.value);
    }
    catch (e) {
        alert(e.message);
    }
}
async function newWindow(session) {
    const name = prompt(`window name in session "${session}" (optional)`) || undefined;
    try {
        await api.newWindow(session, name);
    }
    catch (e) {
        alert(e.message);
    }
}
// Pick the last few non-blank lines of preview as a multi-line summary.
// On mobile we show this in place of the full preview, so 3 lines is a
// useful glance: usually shows the prompt + last command output.
function summarize(lines) {
    const out = [];
    for (let i = lines.length - 1; i >= 0 && out.length < 3; i--) {
        const t = lines[i].replace(/\s+$/, '');
        if (t)
            out.unshift(t);
    }
    return out.length ? out.join('\n') : '(idle)';
}
function humanAge(ms) {
    const s = Math.round(ms / 1000);
    if (s < 5)
        return 'live';
    if (s < 60)
        return `${s}s`;
    if (s < 3600)
        return `${Math.floor(s / 60)}m`;
    return `${Math.floor(s / 3600)}h`;
}
function statusLabel(s) {
    if (s === 'warn')
        return 'wait'; // user input wanted
    if (s === 'err')
        return 'err';
    return ''; // ok / running / idle = no label
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['wall']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['attn-done']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-running']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-warn']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-err']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-err']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['attn']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['done']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-full']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wall" },
});
if (__VLS_ctx.status !== 'open') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "status-banner" },
    });
    (__VLS_ctx.status);
}
if (__VLS_ctx.snap && __VLS_ctx.snap.sessions.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "session name",
    });
    (__VLS_ctx.newSessionName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createSession) },
    });
}
for (const [s] of __VLS_getVForSourceType((__VLS_ctx.snap?.sessions ?? []))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        key: (s.name),
        ...{ class: "session" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
        ...{ class: "session-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "dot" },
        ...{ class: ({ attached: s.attached }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "name" },
    });
    (s.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "count" },
    });
    (s.windows.length);
    (s.windows.length === 1 ? '' : 's');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.newWindow(s.name);
            } },
        ...{ class: "add" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid" },
    });
    for (const [w] of __VLS_getVForSourceType((s.windows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.open(s.name, w);
                } },
            key: (`${s.name}:${w.id}`),
            ...{ class: "tile" },
            ...{ class: ([
                    'st-' + w.status,
                    w.attention ? 'attn-' + w.attention : null,
                ]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tile-dot" },
            ...{ class: ({ pulse: !!w.attention || w.status === 'warn' }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tile-name" },
        });
        (w.index);
        (w.name);
        if (w.attention === 'input-needed') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-badge attn" },
            });
        }
        else if (w.attention === 'done') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-badge done" },
            });
        }
        else if (__VLS_ctx.statusLabel(w.status)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "status-badge" },
            });
            (__VLS_ctx.statusLabel(w.status));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "age" },
        });
        (__VLS_ctx.humanAge(w.lastOutputAgeMs));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "preview-summary" },
        });
        (__VLS_ctx.summarize(w.preview));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "preview-full" },
        });
        (w.preview.join('\n'));
    }
    if (s.windows.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "session-empty" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['wall']} */ ;
/** @type {__VLS_StyleScopedClasses['status-banner']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['session']} */ ;
/** @type {__VLS_StyleScopedClasses['session-header']} */ ;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
/** @type {__VLS_StyleScopedClasses['count']} */ ;
/** @type {__VLS_StyleScopedClasses['add']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-name']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['attn']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['done']} */ ;
/** @type {__VLS_StyleScopedClasses['status-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['age']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-full']} */ ;
/** @type {__VLS_StyleScopedClasses['session-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            snap: snap,
            status: status,
            newSessionName: newSessionName,
            open: open,
            createSession: createSession,
            newWindow: newWindow,
            summarize: summarize,
            humanAge: humanAge,
            statusLabel: statusLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
