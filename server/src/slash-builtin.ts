import type { SlashMenuItem } from './slash-types.js';

export const BUILTIN_SLASH: SlashMenuItem[] = [
  { name: 'clear',   desc: 'Clear conversation' },
  { name: 'compact', desc: 'Compact conversation context' },
  { name: 'cost',    desc: 'Show token usage and cost' },
  { name: 'help',    desc: 'Show help and available commands' },
  { name: 'resume',  desc: 'Resume a previous session' },
  { name: 'agents',  desc: 'Manage subagents' },
  { name: 'model',   desc: 'Switch model' },
  { name: 'config',  desc: 'Open config panel' },
];

/**
 * Merge SDK-derived list with builtin list.
 * SDK items take precedence (same-name builtin dropped).
 */
export function mergeBuiltin(sdkItems: SlashMenuItem[]): SlashMenuItem[] {
  const sdkNames = new Set(sdkItems.map(i => i.name));
  const builtinOnly = BUILTIN_SLASH.filter(b => !sdkNames.has(b.name));
  return [...sdkItems, ...builtinOnly];
}
