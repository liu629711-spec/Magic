// Magic 客户端（2026-09-20）：remote-events waterfall 桥——官方 api-gateway 客户端
// 协议的直连移植（reference-project/deepseek-harness/packages/api/gateway/src/
// client/remote-events.ts）。经 remote.mux 开 `$events` 流：ready 帧记 clientId，
// waterfall 帧交 handler 认领（返回 undefined = next 交还链），应答 POST
// `$events/result`。Magic 目前只认领 user-questions/request 的 plan-review intent
// （PRD-02 §15.4 计划审批）；其余事件 next 放行，与官方页共存时先答者赢。
import { dshRpc } from "./rpc";
import { RemoteMux } from "./mux";

export interface RemoteEventHandlers {
  /** 认领一个 waterfall 请求：返回应答值（result），undefined = next 放行。 */
  waterfall?: (event: string, agentId: string, eventId: string, request: Record<string, unknown>) => Promise<unknown | undefined>;
  /** 宿主取消了一个未应答的 waterfall 请求。 */
  cancel?: (eventId: string) => void;
}

let mux: RemoteMux | undefined;
let started = false;
let clientId: string | undefined;
let handlers: RemoteEventHandlers | undefined;

/** 打开（幂等）$events 转发事件流并注册处理器；返回退订（仅解除处理器引用）。 */
export function subscribeRemoteEvents(next: RemoteEventHandlers): () => void {
  handlers = next;
  if (!started) {
    started = true;
    mux ??= new RemoteMux();
    mux.open("$events", { args: {} }, {
      onItem: value => {
        const frame = value as Record<string, unknown>;
        const type = frame?.type;
        if (type === "ready") {
          if (typeof frame.clientId === "string") clientId = frame.clientId;
          return;
        }
        if (type === "waterfall") {
          const eventId = frame.eventId;
          const eventName = frame.event;
          const agentId = frame.agentId;
          if (typeof eventId !== "string" || typeof eventName !== "string") return;
          const request = (frame.request ?? {}) as Record<string, unknown>;
          void (async () => {
            let outcome: unknown;
            try {
              const claimed = await handlers?.waterfall?.(eventName, typeof agentId === "string" ? agentId : "", eventId, request);
              outcome = claimed === undefined ? { kind: "next" } : { kind: "result", value: claimed };
            } catch (error) {
              outcome = {
                kind: "rejected",
                error: { message: error instanceof Error ? error.message : String(error) },
              };
            }
            if (clientId === undefined) return;
            await dshRpc("$events/result", { clientId, eventId, outcome }).catch(() => undefined);
          })();
          return;
        }
        if (type === "cancel" && typeof frame.eventId === "string") {
          handlers?.cancel?.(frame.eventId);
        }
        // emit 帧：Magic 暂无消费者，忽略。
      },
      onError: () => {
        // mux 自带重连；重连后 open 重放（ready 会重新发 clientId）。
      },
      onEnd: () => {
        started = false;
      },
    });
  }
  return () => {
    handlers = undefined;
  };
}
