import XtermPane from '../components/XtermPane.vue';
import StatusPanel from '../components/StatusPanel.vue';
import ScrollControls from '../components/ScrollControls.vue';
import InputBar from '../components/InputBar.vue';
import FixedButtonBar from '../components/FixedButtonBar.vue';
import { api } from '../api';
const props = defineProps();
async function onSend(payload) {
    try {
        await api.send(props.session, props.id, payload);
    }
    catch (e) {
        alert(e.message);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "attached" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "bar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$router.push('/');
        } },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "bc" },
});
(__VLS_ctx.session);
(__VLS_ctx.id);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "body" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "term-area" },
});
/** @type {[typeof XtermPane, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(XtermPane, new XtermPane({
    session: (__VLS_ctx.session),
    windowId: (__VLS_ctx.id),
}));
const __VLS_1 = __VLS_0({
    session: (__VLS_ctx.session),
    windowId: (__VLS_ctx.id),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
/** @type {[typeof StatusPanel, ]} */ ;
// @ts-ignore
const __VLS_3 = __VLS_asFunctionalComponent(StatusPanel, new StatusPanel({
    windowId: (__VLS_ctx.id),
    title: (`${__VLS_ctx.session} : ${__VLS_ctx.id}`),
}));
const __VLS_4 = __VLS_3({
    windowId: (__VLS_ctx.id),
    title: (`${__VLS_ctx.session} : ${__VLS_ctx.id}`),
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
/** @type {[typeof ScrollControls, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(ScrollControls, new ScrollControls({
    session: (__VLS_ctx.session),
    windowId: (__VLS_ctx.id),
}));
const __VLS_7 = __VLS_6({
    session: (__VLS_ctx.session),
    windowId: (__VLS_ctx.id),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
/** @type {[typeof InputBar, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(InputBar, new InputBar({
    ...{ 'onSend': {} },
}));
const __VLS_10 = __VLS_9({
    ...{ 'onSend': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
let __VLS_12;
let __VLS_13;
let __VLS_14;
const __VLS_15 = {
    onSend: (__VLS_ctx.onSend)
};
var __VLS_11;
/** @type {[typeof FixedButtonBar, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(FixedButtonBar, new FixedButtonBar({
    ...{ 'onSend': {} },
}));
const __VLS_17 = __VLS_16({
    ...{ 'onSend': {} },
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onSend: (__VLS_ctx.onSend)
};
var __VLS_18;
/** @type {__VLS_StyleScopedClasses['attached']} */ ;
/** @type {__VLS_StyleScopedClasses['bar']} */ ;
/** @type {__VLS_StyleScopedClasses['bc']} */ ;
/** @type {__VLS_StyleScopedClasses['body']} */ ;
/** @type {__VLS_StyleScopedClasses['term-area']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            XtermPane: XtermPane,
            StatusPanel: StatusPanel,
            ScrollControls: ScrollControls,
            InputBar: InputBar,
            FixedButtonBar: FixedButtonBar,
            onSend: onSend,
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
