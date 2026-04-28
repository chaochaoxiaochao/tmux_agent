import { onMounted, ref } from 'vue';
import { api } from '../api';
import ButtonEditor from './ButtonEditor.vue';
const buttons = ref([]);
const editing = ref(false);
const __VLS_emit = defineEmits();
async function reload() { buttons.value = await api.buttons(); }
onMounted(reload);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['btnbar']} */ ;
/** @type {__VLS_StyleScopedClasses['btnbar']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "btnbar" },
});
for (const [b] of __VLS_getVForSourceType((__VLS_ctx.buttons))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.$emit('send', b.payload);
            } },
        key: (b.id),
    });
    (b.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.editing = !__VLS_ctx.editing;
        } },
    ...{ class: "edit" },
});
if (__VLS_ctx.editing) {
    /** @type {[typeof ButtonEditor, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(ButtonEditor, new ButtonEditor({
        ...{ 'onClose': {} },
        ...{ 'onChanged': {} },
    }));
    const __VLS_1 = __VLS_0({
        ...{ 'onClose': {} },
        ...{ 'onChanged': {} },
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    let __VLS_3;
    let __VLS_4;
    let __VLS_5;
    const __VLS_6 = {
        onClose: (...[$event]) => {
            if (!(__VLS_ctx.editing))
                return;
            __VLS_ctx.editing = false;
        }
    };
    const __VLS_7 = {
        onChanged: (__VLS_ctx.reload)
    };
    var __VLS_2;
}
/** @type {__VLS_StyleScopedClasses['btnbar']} */ ;
/** @type {__VLS_StyleScopedClasses['edit']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            ButtonEditor: ButtonEditor,
            buttons: buttons,
            editing: editing,
            reload: reload,
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
