import type { StatusRule } from './config.schema.js';

export type WindowStatus = 'ok' | 'warn' | 'err' | 'running' | 'idle';

export function evaluateStatus(
  previewLines: string[],
  rules: StatusRule[],
  lastOutputAgeMs: number,
): WindowStatus {
  const compiled = rules.map(r => ({ re: new RegExp(r.match), status: r.status }));
  for (let i = previewLines.length - 1; i >= 0; i--) {
    const line = previewLines[i];
    for (const r of compiled) {
      if (r.re.test(line)) return r.status;
    }
  }
  return lastOutputAgeMs < 5000 ? 'running' : 'idle';
}
