import type { SlashMenuItem } from './slash-types.js';

const SDK_TIMEOUT_MS = 5000;

/**
 * Fetch slash command list from a forked Claude CLI subprocess via the SDK's
 * control protocol — no Anthropic API round-trip, no token cost.
 *
 * How it works:
 * - Pass a hanging async iterable as `prompt` so the SDK enters streaming-input
 *   mode but never receives any user message → the CLI subprocess starts up,
 *   scans skills/plugins/commands locally, reports the list via control
 *   protocol, then sits idle waiting for input.
 * - We call `q.supportedCommands()` to read that list directly from the
 *   resolved initialization state. This is a public SDK method that doesn't
 *   require iterating the message stream.
 * - Abort immediately after, killing the idle child process.
 *
 * Caveats:
 * - Returns name+desc items; argumentHint/aliases are dropped (caller's
 *   SlashMenuItem shape doesn't carry them today).
 * - cwd controls which project-level skills get included.
 * - settingSources: ['user','project'] also pulls user-global skills.
 * - 5-second hard timeout via AbortController; on failure / timeout / missing
 *   SDK returns []. finally clause aborts the child process whether we hit
 *   success, timeout, or threw.
 *
 * History: previous implementation passed `prompt: 'x'` and broke after the
 * `system/init` message, on the assumption that the prompt would never reach
 * Anthropic. That assumption was wrong — abort fired too late and each call
 * burned ~25k cache_creation + 5 output tokens and triggered the Stop hook,
 * which sent a spurious notification. supportedCommands() avoids both.
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
    const q = sdk.query({
      // Hanging iterable: never resolves, never yields. Keeps the CLI's stdin
      // open so it stays in "ready, waiting for user" state — never forwards
      // anything to Anthropic.
      prompt: (async function* () {
        await new Promise<void>(() => { /* never */ });
      })(),
      options: {
        cwd,
        settingSources: ['user', 'project'],
        abortController: ac,
      },
    });
    const commands = await q.supportedCommands();
    return commands.map(c => ({
      name: c.name,
      ...(c.description ? { desc: c.description } : {}),
    }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[slash-sdk] fetch failed:', err);
    return [];
  } finally {
    clearTimeout(timer);
    // Abort (idempotent) tears down the CLI subprocess whether we returned
    // via supportedCommands(), threw, or timed out.
    ac.abort();
  }
}
