import { ref, onMounted } from 'vue';
import { api } from '../api';
const buttons = ref([]);
const newLabel = ref('');
const newPayload = ref('');
const emit = defineEmits();
onMounted(async () => { buttons.value = await api.buttons(); });
async function save(b) { await api.updateButton(b.id, { label: b.label, payload: b.payload }); emit('changed'); }
async function del(id) { await api.deleteButton(id); buttons.value = buttons.value.filter(b => b.id !== id); emit('changed'); }
async function add() {
    if (!newLabel.value)
        return;
    const b = await api.createButton({ label: newLabel.value, payload: newPayload.value });
    buttons.value.push(b);
    newLabel.value = newPayload.value = '';
    emit('changed');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "editor" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
for (const [b] of __VLS_getVForSourceType((__VLS_ctx.buttons))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (b.id),
        ...{ class: "row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({});
    (b.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        placeholder: "\u0070\u0061\u0079\u006c\u006f\u0061\u0064\u0020\u0028\u005c\u006e\u003d\u0045\u006e\u0074\u0065\u0072\u002c\u0020\u005c\u0074\u003d\u0054\u0061\u0062\u002c\u0020\u005c\u0078\u0031\u0062\u003d\u0045\u0053\u0043\u0029",
    });
    (b.payload);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.save(b);
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.del(b.id);
            } },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "label",
});
(__VLS_ctx.newLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    placeholder: "payload",
});
(__VLS_ctx.newPayload);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.add) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.$emit('close');
        } },
    ...{ class: "close" },
});
/** @type {__VLS_StyleScopedClasses['editor']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['row']} */ ;
/** @type {__VLS_StyleScopedClasses['close']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            buttons: buttons,
            newLabel: newLabel,
            newPayload: newPayload,
            save: save,
            del: del,
            add: add,
        };
    },
    __typeEmits: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
});
; /* PartiallyEnd: #4569/main.vue */
