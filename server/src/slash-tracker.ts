import { parseSlashMenu, type SlashParseResult, type SlashMenuItem } from './slash-parser';

export type SlashMenuFrame =
  | { type: 'slash-menu'; items: SlashMenuItem[]; active: number }
  | { type: 'slash-menu-close' };

const BUF_MAX = 8192; // 够装一屏菜单浮窗;过大反而拖累 parser

export class SlashMenuTracker {
  private buf = '';
  private last: SlashParseResult = { state: 'idle' };
  constructor(private readonly onChange: (frame: SlashMenuFrame) => void) {}

  feed(chunk: string): void {
    try {
      this.buf += chunk;
      if (this.buf.length > BUF_MAX) {
        this.buf = this.buf.slice(this.buf.length - BUF_MAX);
      }
      const cur = parseSlashMenu(this.buf);
      if (!this.isChanged(this.last, cur)) return;
      this.last = cur;
      if (cur.state === 'idle') {
        this.onChange({ type: 'slash-menu-close' });
      } else {
        this.onChange({ type: 'slash-menu', items: cur.items, active: cur.active });
      }
    } catch (err) {
      // 解析异常一律降级为 idle,不影响 binary 路径
      // eslint-disable-next-line no-console
      console.warn('[slash-tracker] parse error, fallback to idle:', err);
      if (this.last.state !== 'idle') {
        this.last = { state: 'idle' };
        this.onChange({ type: 'slash-menu-close' });
      }
    }
  }

  private isChanged(a: SlashParseResult, b: SlashParseResult): boolean {
    if (a.state !== b.state) return true;
    if (a.state === 'idle') return false; // b 也 idle
    // 都是 menu:比较 active + items
    const bMenu = b as Extract<SlashParseResult, { state: 'menu' }>;
    if (a.active !== bMenu.active) return true;
    if (a.items.length !== bMenu.items.length) return true;
    for (let i = 0; i < a.items.length; i++) {
      if (a.items[i].name !== bMenu.items[i].name) return true;
      if ((a.items[i].desc ?? '') !== (bMenu.items[i].desc ?? '')) return true;
    }
    return false;
  }
}
