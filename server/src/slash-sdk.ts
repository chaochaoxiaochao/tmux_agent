import type { SlashMenuItem } from './slash-types.js';

const SDK_TIMEOUT_MS = 5000;

/**
 * Fetch slash command list from Claude Agent SDK's system/init message.
 *
 * - Returns name-only items (SDK provides no desc); caller can merge with
 *   builtin to fill desc for known builtins.
 * - cwd controls which project-level skills get included.
 * - settingSources: ['user','project'] also pulls user-global skills.
 * - Breaks immediately after init — does NOT process prompt (0 token cost,
 *   verified by setting ANTHROPIC_BASE_URL to unreachable address: still works).
 * - 5-second hard timeout via AbortController; on failure / timeout /
 *   missing SDK returns []. finally clause aborts the SDK child process
 *   so it does not pile up under load.
 */
export async function fetchSlashList(cwd: string): Promise<SlashMenuItem[]> {
  let sdk: typeof import('@anthropic-ai/claude-agent-sdk');
  try {
    sdk = await import('@anthropic-ai/claude-agent-sdk');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[slash-sdk] package not installed, returning []:', err);
    return [];
  }

  const ac = new AbortController();
  const timer = setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn('[slash-sdk] timeout after', SDK_TIMEOUT_MS, 'ms, aborting');
    ac.abort();
  }, SDK_TIMEOUT_MS);

  try {
    const iter = sdk.query({
      prompt: 'x',
      options: {
        maxTurns: 1,
        cwd,
        settingSources: ['user', 'project'],
        abortController: ac,
      },
    });
    for await (const msg of iter) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        const names: string[] = msg.slash_commands ?? [];
        return names.map(name => ({ name }));
      }
    }
    return [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[slash-sdk] fetch failed:', err);
    return [];
  } finally {
    clearTimeout(timer);
    // Abort (idempotent) ensures the SDK child process is torn down whether
    // we returned via init match, exhausted iterator, threw, or timed out.
    ac.abort();
  }
}
