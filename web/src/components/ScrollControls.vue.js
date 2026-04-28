import { api } from '../api';
const props = defineProps();
async function enter() {
    try {
        await api.copyMode(props.session, props.windowId);
    }
    catch (e) {
        alert(e.message);
    }
}
async function key(k) {
    try {
        await api.sendKey(props.session, props.windowId, k);
    }
    catch (e) {
        alert(e.message);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['scrollctl']} */ ;
/** @type {__VLS_StyleScopedClasses['scrollctl']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "scrollctl" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.enter) },
    ...{ class: "primary" },
    title: ('Enter tmux copy-mode (history)'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.key('Up');
        } },
    title: ('Scroll up one line'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.key('Down');
        } },
    title: ('Scroll down one line'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.key('PageUp');
        } },
    title: ('Page up'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.key('PageDown');
        } },
    title: ('Page down'),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.key('q');
        } },
    title: ('Exit copy-mode'),
});
/** @type {__VLS_StyleScopedClasses['scrollctl']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            enter: enter,
            key: key,
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
