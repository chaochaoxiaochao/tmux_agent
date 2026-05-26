import type { RichNotification, Button } from './types.js';

export function buildLarkCard(n: RichNotification): any {
  const elements: any[] = [];

  elements.push({
    tag: 'div',
    text: { tag: 'lark_md', content: n.body },
  });

  if (n.fields.length > 0) {
    elements.push({
      tag: 'div',
      fields: n.fields.map(f => ({
        is_short: true,
        text: { tag: 'lark_md', content: `**${f.label}**\n\`${f.value}\`` },
      })),
    });
  }

  if (n.agentsSnapshot) {
    elements.push({ tag: 'hr' });
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: n.agentsSnapshot } });
  }

  if (n.buttons.length > 0) {
    elements.push({
      tag: 'action',
      actions: n.buttons.map(buttonToCardAction),
    });
  }

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: n.headline },
      template: pickHeaderColor(n.headline),
    },
    elements,
  };
}

function buttonToCardAction(b: Button): any {
  const base: any = {
    tag: 'button',
    text: { tag: 'plain_text', content: b.text },
    type: b.style,
  };
  if (b.kind === 'link') base.url = b.url;
  else base.value = b.value;
  return base;
}

// Headline emoji prefixes must stay in sync with src/notify/render.ts; if you
// add a new event headline there, add its color here or it falls back to grey.
function pickHeaderColor(headline: string): string {
  if (headline.startsWith('✅')) return 'green';
  if (headline.startsWith('🔐')) return 'orange';
  if (headline.startsWith('❓')) return 'blue';
  if (headline.startsWith('🔔')) return 'turquoise';
  return 'grey';
}
