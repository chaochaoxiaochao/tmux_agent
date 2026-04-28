export interface ReconnectingWSOpts { onMessage: (data: any) => void; onStatus?: (s: 'connecting' | 'open' | 'closed') => void }

export class ReconnectingWS {
  private sock: WebSocket | null = null;
  private closed = false;
  private retry = 1000;
  constructor(public url: string, public opts: ReconnectingWSOpts) {
    this.connect();
  }
  private connect() {
    if (this.closed) return;
    this.opts.onStatus?.('connecting');
    this.sock = new WebSocket(this.url);
    this.sock.binaryType = 'arraybuffer';
    this.sock.onopen = () => { this.retry = 1000; this.opts.onStatus?.('open'); };
    this.sock.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try { this.opts.onMessage(JSON.parse(ev.data)); } catch { }
      } else {
        this.opts.onMessage(ev.data);
      }
    };
    this.sock.onclose = () => {
      this.opts.onStatus?.('closed');
      if (this.closed) return;
      const delay = Math.min(this.retry, 10000);
      this.retry = Math.min(this.retry * 2, 10000);
      setTimeout(() => this.connect(), delay);
    };
  }
  send(data: any) { this.sock?.send(data); }
  close() { this.closed = true; this.sock?.close(); }
}
