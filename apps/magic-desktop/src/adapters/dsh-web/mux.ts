// Remote 多路复用 WS 客户端（/api/remote.mux）。
// 帧协议：gateway/src/stream-protocol.ts:242-263 —— 客户端发 {type:'open',streamId,endpoint,payload}
// / {type:'cancel',streamId}；服务端回 {type:'item',streamId,value?} / {type:'error',...} / {type:'end',streamId}。
// 断线自动重连：重连后对全部存活流重发 open（follow 流会重新下发 snapshot，上层整窗替换即可）。

export type MuxStreamHandler = {
  onItem: (value: unknown) => void;
  onError: (error: { code: string; message: string }) => void;
  onEnd: () => void;
};

export class RemoteMux {
  private socket: WebSocket | undefined;
  private readonly streams = new Map<
    string,
    { endpoint: string; payload: unknown; handler: MuxStreamHandler }
  >();
  private nextId = 1;
  private retry = 0;
  private disposed = false;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.disposed) return;
    const url = `${window.location.origin.replace(/^http/, "ws")}/api/remote.mux`;
    const socket = new WebSocket(url);
    this.socket = socket;
    socket.onopen = () => {
      this.retry = 0;
      // 重连后重放全部存活流：follow 流重新下发 snapshot，上层整窗替换。
      for (const streamId of this.streams.keys()) this.sendOpen(streamId);
    };
    socket.onmessage = (event) => {
      let frame: {
        type?: string;
        streamId?: string;
        value?: unknown;
        error?: { code?: string; message?: string };
      };
      try {
        frame = JSON.parse(event.data as string);
      } catch {
        return;
      }
      if (typeof frame.streamId !== "string") return;
      const stream = this.streams.get(frame.streamId);
      if (stream === undefined) return;
      if (frame.type === "item") stream.handler.onItem(frame.value);
      else if (frame.type === "error") {
        stream.handler.onError({ code: frame.error?.code ?? "unknown", message: frame.error?.message ?? "未知错误" });
      } else if (frame.type === "end") {
        stream.handler.onEnd();
        this.streams.delete(frame.streamId);
      }
    };
    socket.onclose = () => {
      if (this.disposed) return;
      this.retryTimer = setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.retry, 10_000));
      this.retry += 1;
    };
  }

  /** 打开一条逻辑流；返回关闭函数。 */
  open(endpoint: string, payload: unknown, handler: MuxStreamHandler): () => void {
    const streamId = `s${this.nextId}`;
    this.nextId += 1;
    this.streams.set(streamId, { endpoint, payload, handler });
    this.sendOpen(streamId);
    return () => {
      this.streams.delete(streamId);
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "cancel", streamId }));
      }
    };
  }

  private sendOpen(streamId: string): void {
    const stream = this.streams.get(streamId);
    if (stream === undefined || this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(
      JSON.stringify({ type: "open", streamId, endpoint: stream.endpoint, payload: stream.payload }),
    );
  }

  dispose(): void {
    this.disposed = true;
    if (this.retryTimer !== undefined) clearTimeout(this.retryTimer);
    this.streams.clear();
    this.socket?.close();
  }
}
