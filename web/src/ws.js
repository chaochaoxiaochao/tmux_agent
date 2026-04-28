export class ReconnectingWS {
    url;
    opts;
    sock = null;
    closed = false;
    retry = 1000;
    constructor(url, opts) {
        this.url = url;
        this.opts = opts;
        this.connect();
    }
    connect() {
        if (this.closed)
            return;
        this.opts.onStatus?.('connecting');
        this.sock = new WebSocket(this.url);
        this.sock.binaryType = 'arraybuffer';
        this.sock.onopen = () => { this.retry = 1000; this.opts.onStatus?.('open'); };
        this.sock.onmessage = (ev) => {
            if (typeof ev.data === 'string') {
                try {
                    this.opts.onMessage(JSON.parse(ev.data));
                }
                catch { }
            }
            else {
                this.opts.onMessage(ev.data);
            }
        };
        this.sock.onclose = () => {
            this.opts.onStatus?.('closed');
            if (this.closed)
                return;
            const delay = Math.min(this.retry, 10000);
            this.retry = Math.min(this.retry * 2, 10000);
            setTimeout(() => this.connect(), delay);
        };
    }
    send(data) { this.sock?.send(data); }
    close() { this.closed = true; this.sock?.close(); }
}
