import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { ReconnectingWS } from '../ws';
const props = defineProps();
const root = ref(null);
let term = null;
let fit = null;
let ws = null;
let ro = null;
function wsUrl(session, id) {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws/term/${encodeURIComponent(session)}/${encodeURIComponent(id)}`;
}
function sendResize() {
    if (!term || !ws)
        return;
    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
}
function connect() {
    ws?.close();
    ws = new ReconnectingWS(wsUrl(props.session, props.windowId), {
        onMessage: data => {
            if (data instanceof ArrayBuffer)
                term?.write(new Uint8Array(data));
        },
    });
    setTimeout(sendResize, 200);
}
onMounted(() => {
    if (!root.value)
        return;
    term = new Terminal({
        fontFamily: 'JetBrains Mono, ui-monospace, monospace',
        fontSize: 13,
        scrollback: 5000,
        theme: { background: '#000' },
    });
    fit = new FitAddon();
    term.loadAddon(fit);
    term.open(root.value);
    fit.fit();
    connect();
    term.onData(d => ws?.send(new TextEncoder().encode(d)));
    ro = new ResizeObserver(() => { fit?.fit(); sendResize(); });
    ro.observe(root.value);
});
onUnmounted(() => {
    ro?.disconnect();
    ws?.close();
    term?.dispose();
});
watch(() => [props.session, props.windowId], () => connect());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "root",
    ...{ class: "xterm-host" },
});
/** @type {typeof __VLS_ctx.root} */ ;
/** @type {__VLS_StyleScopedClasses['xterm-host']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            root: root,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
