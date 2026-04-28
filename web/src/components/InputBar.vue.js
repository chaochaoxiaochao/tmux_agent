import { onMounted, onUnmounted, ref, watch } from 'vue';
import MentionPicker from './MentionPicker.vue';
import { api } from '../api';
const text = ref('');
const recording = ref(false);
const items = ref([]);
const active = ref(0);
const triggerChar = ref(null);
const inputEl = ref(null);
const wrapEl = ref(null);
// On mobile, when the on-screen keyboard appears the visualViewport shrinks.
// Whenever it resizes (keyboard show/hide/rotate), make sure the input bar
// stays above the keyboard.
function ensureInputVisible() {
    if (!wrapEl.value)
        return;
    // Use rAF + small timeout so layout has stabilized after keyboard animation.
    requestAnimationFrame(() => {
        setTimeout(() => {
            wrapEl.value?.scrollIntoView({ block: 'end', behavior: 'smooth' });
        }, 50);
    });
}
function onFocus() {
    // Initial focus: keyboard may take ~300ms to appear, retry once.
    ensureInputVisible();
    setTimeout(ensureInputVisible, 350);
}
const onViewportResize = () => {
    // Only react if the input is the active element — avoids fighting the user
    // when the keyboard hides and they're scrolling around the terminal.
    if (document.activeElement === inputEl.value)
        ensureInputVisible();
};
onMounted(() => {
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onViewportResize);
});
onUnmounted(() => {
    const vv = window.visualViewport;
    vv?.removeEventListener('resize', onViewportResize);
});
const emit = defineEmits();
function send() {
    if (!text.value)
        return;
    emit('send', text.value + '\n');
    text.value = '';
    items.value = [];
}
function detectTrigger() {
    const v = text.value;
    for (let i = v.length - 1; i >= 0; i--) {
        const c = v[i];
        if (c === ' ')
            return null;
        if (c === '@' || c === '/')
            return { char: c, suffix: v.slice(i + 1) };
    }
    return null;
}
watch(text, async () => {
    const trig = detectTrigger();
    if (!trig) {
        items.value = [];
        triggerChar.value = null;
        return;
    }
    triggerChar.value = trig.char;
    try {
        items.value = trig.char === '@'
            ? await api.files(trig.suffix)
            : await api.commands(trig.suffix);
        active.value = 0;
    }
    catch {
        items.value = [];
    }
});
function pick(it) {
    const trig = detectTrigger();
    if (!trig)
        return;
    const before = text.value.slice(0, text.value.length - trig.suffix.length - 1);
    const insert = it.kind === 'file' ? `@${it.path} ` : it.payload;
    text.value = before + insert;
    items.value = [];
    inputEl.value?.focus();
}
function onKey(ev) {
    if (items.value.length) {
        if (ev.key === 'ArrowDown') {
            active.value = (active.value + 1) % items.value.length;
            ev.preventDefault();
            return;
        }
        if (ev.key === 'ArrowUp') {
            active.value = (active.value - 1 + items.value.length) % items.value.length;
            ev.preventDefault();
            return;
        }
        if (ev.key === 'Enter') {
            pick(items.value[active.value]);
            ev.preventDefault();
            return;
        }
        if (ev.key === 'Escape') {
            items.value = [];
            ev.preventDefault();
            return;
        }
    }
    else if (ev.key === 'Enter') {
        send();
        ev.preventDefault();
    }
}
let rec = null;
function toggleVoice() {
    const W = window;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
        alert('Web Speech API unsupported');
        return;
    }
    if (recording.value && rec) {
        rec.stop();
        return;
    }
    rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = navigator.language || 'en-US';
    rec.onresult = (ev) => { text.value += ev.results[0][0].transcript; };
    rec.onend = () => { recording.value = false; };
    rec.start();
    recording.value = true;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['inputbar']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "wrapEl",
    ...{ class: "inputbar-wrap" },
});
/** @type {typeof __VLS_ctx.wrapEl} */ ;
/** @type {[typeof MentionPicker, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(MentionPicker, new MentionPicker({
    ...{ 'onPick': {} },
    items: (__VLS_ctx.items),
    active: (__VLS_ctx.active),
}));
const __VLS_1 = __VLS_0({
    ...{ 'onPick': {} },
    items: (__VLS_ctx.items),
    active: (__VLS_ctx.active),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
let __VLS_3;
let __VLS_4;
let __VLS_5;
const __VLS_6 = {
    onPick: (__VLS_ctx.pick)
};
var __VLS_2;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inputbar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeydown: (__VLS_ctx.onKey) },
    ...{ onFocus: (__VLS_ctx.onFocus) },
    ref: "inputEl",
    placeholder: "type or 🎤 ...",
});
(__VLS_ctx.text);
/** @type {typeof __VLS_ctx.inputEl} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleVoice) },
    ...{ class: ({ rec: __VLS_ctx.recording }) },
});
(__VLS_ctx.recording ? '● rec' : '🎤');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.send) },
    ...{ class: "send" },
});
/** @type {__VLS_StyleScopedClasses['inputbar-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['inputbar']} */ ;
/** @type {__VLS_StyleScopedClasses['send']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MentionPicker: MentionPicker,
            text: text,
            recording: recording,
            items: items,
            active: active,
            inputEl: inputEl,
            wrapEl: wrapEl,
            onFocus: onFocus,
            send: send,
            pick: pick,
            onKey: onKey,
            toggleVoice: toggleVoice,
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
