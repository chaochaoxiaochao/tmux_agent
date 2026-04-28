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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dot']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-warn']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tile']} */ ;
/** @type {__VLS_StyleScopedClasses['st-err']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-dot']} */ ;
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
            ...{ class: (['st-' + w.status]) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tile-dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tile-name" },
        });
        (w.index);
        (w.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "age" },
        });
        (Math.round(w.lastOutputAgeMs / 1000));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "preview" },
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
/** @type {__VLS_StyleScopedClasses['age']} */ ;
/** @type {__VLS_StyleScopedClasses['preview']} */ ;
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
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
