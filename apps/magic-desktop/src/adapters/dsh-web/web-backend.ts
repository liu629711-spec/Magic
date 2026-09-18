// 会话域适配 + React 接入 hook（SDK 接线 M1）。
// 契约源自 session-controller（packages/api/session-controller）：
// - session/list   args {}            → {items: SessionSummary[]}（manager.ts:462）
// - session/create args {cwd?}        → SessionId（ISessions.create）
// - session/prompt args {requestId,sessionId,mode,content,clientTimeZone}（session.ts:249-255）
// - session/rename args {sessionId,title} → {title,seq}（session.ts:358）
// - session/fork   args {sessionId}   → {sessionId}（manager.ts:599-602）
// - session/follow 流 args {address:{kind:'session',sessionId},assistantStream:true}：
//   item = {type:'snapshot',records:[{type:'event',event}],hasMore,projections,assistantStream?}
//        | {type:'event',event} | {type:'assistant-stream',frame}（transport.ts:172-220）；
//          event 即 SessionEvent，与 vendor/dsh-chat 折叠层契约完全一致（server.ts:95-98）。
//   assistant-stream 帧按上游 ClientAssistantStream（session-controller/src/client/
//   sessions/assistant-stream.ts:120-183）的语义折叠为 assistant/live-chunk 瞬态事件。
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatSessionStore, SessionProjectionBaseline } from "../../conversation/chat-store";
import type { AssistantLiveChunkEvent } from "../../vendor/dsh-chat/index.ts";
import { dshAuthExchange, dshProbeAuth, dshRpc, tokenFromInput } from "./rpc";
import { RemoteMux } from "./mux";

export interface RemoteSessionRow {
  sessionId: string;
  title: string;
  updatedAt: number;
  running: boolean;
  blank: boolean;
  cwd?: string;
  parentSessionId?: string;
  /** 会话模型选择（projections.values.modelSelection：pending 优先，其次 lastUsed） */
  model?: { provider: string; model: string };
  /** 会话预设 id（projections.values.agentPreset；官方 AgentPresetLabel 数据源） */
  preset?: string;
}

function titleOfSummary(raw: Record<string, unknown>): string {
  const values = (raw.projections as Record<string, unknown> | undefined)?.values as
    | Record<string, unknown>
    | undefined;
  const title = values?.title;
  if (typeof title === "string" && title.length > 0) return title;
  if (title !== null && typeof title === "object") {
    const inner = (title as Record<string, unknown>).value;
    if (typeof inner === "string" && inner.length > 0) return inner;
  }
  if (raw.blank === true) return "新任务";
  return `会话 ${String(raw.sessionId ?? "").slice(0, 8)}`;
}

function toRow(raw: Record<string, unknown>): RemoteSessionRow {
  const values = (raw.projections as Record<string, unknown> | undefined)?.values as
    | Record<string, unknown>
    | undefined;
  const selection = values?.modelSelection as
    | { lastUsed?: { provider?: string; model?: string }; pending?: { provider?: string; model?: string } }
    | undefined;
  const chosen = selection?.pending ?? selection?.lastUsed;
  return {
    sessionId: String(raw.sessionId ?? ""),
    title: titleOfSummary(raw),
    updatedAt: Number(raw.updatedAt ?? 0),
    running: raw.running === true,
    blank: raw.blank === true,
    cwd: typeof raw.cwd === "string" ? raw.cwd : undefined,
    parentSessionId: typeof raw.parentSessionId === "string" ? raw.parentSessionId : undefined,
    model:
      typeof chosen?.provider === "string" && typeof chosen?.model === "string"
        ? { provider: chosen.provider, model: chosen.model }
        : undefined,
    preset: typeof values?.agentPreset === "string" ? values.agentPreset : undefined,
  };
}

/** 解析 follow 快照帧的 projections（SessionProjectionBaseline）；缺失/形状不符返回 undefined。 */
function normalizeProjections(raw: unknown): SessionProjectionBaseline | undefined {
  if (raw === null || typeof raw !== "object") return undefined;
  const value = raw as { asOfSeq?: unknown; values?: unknown };
  if (typeof value.asOfSeq !== "number") return undefined;
  const values =
    value.values !== null && typeof value.values === "object"
      ? (value.values as Record<string, unknown>)
      : {};
  return { asOfSeq: value.asOfSeq, values };
}

/** 当前 assistant 流式尝试（对齐上游 ActiveAttempt）。 */
interface AssistantAttemptFold {
  attemptId: string;
  turn: number;
  step: number;
  /** 下一帧 chunk 期望的稠密序号。 */
  nextIndex: number;
}

export type WebBackendStatus = "disabled" | "probing" | "need-auth" | "ready" | "error";

export function useWebBackend(enabled: boolean): {
  status: WebBackendStatus;
  errorMessage: string;
  sessions: RemoteSessionRow[];
  connect: (tokenInput: string) => Promise<void>;
  refresh: () => Promise<void>;
  createSession: () => Promise<string>;
  follow: (sessionId: string, store: ChatSessionStore, parentSessionId?: string) => () => void;
  prompt: (sessionId: string, text: string) => Promise<void>;
  fork: (sessionId: string) => Promise<string>;
  rename: (sessionId: string, title: string) => Promise<string>;
  selectModel: (sessionId: string, provider: string, model: string) => Promise<void>;
} {
  const [status, setStatus] = useState<WebBackendStatus>(enabled ? "probing" : "disabled");
  const [errorMessage, setErrorMessage] = useState("");
  const [sessions, setSessions] = useState<RemoteSessionRow[]>([]);
  const muxRef = useRef<RemoteMux | undefined>(undefined);

  const mux = useCallback((): RemoteMux => {
    if (muxRef.current === undefined) muxRef.current = new RemoteMux();
    return muxRef.current;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        const probe = await dshProbeAuth();
        if (cancelled) return;
        if (probe === "need-auth") {
          setStatus("need-auth");
          return;
        }
        const items = await listSessions();
        if (cancelled) return;
        setSessions(items);
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    return () => muxRef.current?.dispose();
  }, [enabled]);

  const refresh = useCallback(async (): Promise<void> => {
    setSessions(await listSessions());
  }, []);

  const connect = useCallback(
    async (tokenInput: string): Promise<void> => {
      const token = tokenFromInput(tokenInput);
      await dshAuthExchange(token);
      setSessions(await listSessions());
      setStatus("ready");
    },
    [],
  );

  const createSession = useCallback(async (): Promise<string> => {
    // RPC args 按生成描述符形参名：create(request)（session-controller/src/index.ts:244）
    const value = await dshRpc<{ sessionId?: string } | string>("session/create", {
      request: {},
    });
    const sessionId = typeof value === "string" ? value : String(value?.sessionId ?? "");
    await refresh();
    return sessionId;
  }, [refresh]);

  const follow = useCallback(
    (sessionId: string, store: ChatSessionStore, parentSessionId?: string): (() => void) => {
      // 子代理会话必须用 subagent 地址（durable parent，否则宿主报 session/agent-busy）；
      // 普通会话用 session 地址（2026-09-18）。
      // 流式瞬态折叠状态（每条 follow 流独立；对齐上游 ClientAssistantStream）。
      // durableCursor = 已见持久事件的最大 seq；瞬态 seq 取其与该 seq+1 之间的分数，
      // 保证引擎按 seq 排序时瞬态排在落定事件之前且严格递增。
      let durableCursor = -1;
      let transientGap = 0;
      let attempt: AssistantAttemptFold | undefined;

      const durableSeq = (event: unknown): number => {
        const seq = (event as { seq?: unknown }).seq;
        return typeof seq === "number" ? seq : -1;
      };

      // 折叠一帧 assistant-stream（types.ts:476-506）：start/chunk/end。
      const acceptAssistantFrame = (raw: unknown): void => {
        const frame = raw as {
          type?: string;
          attemptId?: unknown;
          turn?: unknown;
          step?: unknown;
          index?: unknown;
          time?: unknown;
          chunk?: unknown;
          outcome?: { kind?: unknown };
        };
        const attemptId = String(frame?.attemptId ?? "");
        if (frame?.type === "start") {
          // 已有活动尝试仍收到 start：协议错位（漏了 end）。清掉旧瞬态、改用新尝试。
          if (attempt !== undefined) store.clearTransients();
          attempt = {
            attemptId,
            turn: Number(frame.turn ?? 0),
            step: Number(frame.step ?? 0),
            nextIndex: 0,
          };
          return;
        }
        if (frame?.type === "chunk") {
          // 无对应 start（挂载晚于尝试开始）或序号断裂：不渲染瞬态，等落定事件。
          if (attempt === undefined || attempt.attemptId !== attemptId) return;
          if (frame.index !== attempt.nextIndex) {
            attempt = undefined;
            return;
          }
          attempt.nextIndex += 1;
          transientGap += 1;
          const event: AssistantLiveChunkEvent = {
            type: "assistant/live-chunk",
            // 上游同式：durableCursor + 1 - 1/(gap+1)（assistant-stream.ts:148）。
            seq: durableCursor + 1 - 1 / (transientGap + 1),
            time: typeof frame.time === "number" ? frame.time : Date.now(),
            data: {
              attemptId: attemptId as never,
              turn: attempt.turn,
              step: attempt.step,
              chunk: frame.chunk as never,
            },
          };
          store.appendTransient(event);
          return;
        }
        if (frame?.type === "end") {
          if (attempt === undefined || attempt.attemptId !== attemptId) return;
          const abandoned = frame.outcome?.kind === "abandoned";
          attempt = undefined;
          if (abandoned) {
            // 尝试被放弃且不会有落定事件：清掉瞬态，避免幽灵文本。
            store.clearTransients();
            transientGap = 0;
          }
        }
      };

      return mux().open(
        "session/follow",
        // 流 open 帧的 payload = {args}，args 按描述符形参名（follow(request)）
        {
          args: {
            request: {
              address:
                parentSessionId !== undefined && parentSessionId.length > 0
                  ? { kind: "subagent", parentSessionId, childSessionId: sessionId, mode: "continuable" }
                  : { kind: "session", sessionId },
              assistantStream: true,
            },
          },
        },
        {
          onItem: (value) => {
            const frame = value as {
              type?: string;
              records?: Array<{ event?: unknown }>;
              projections?: unknown;
              assistantStream?: {
                activeAttempt?: { attemptId?: unknown; turn?: unknown; step?: unknown; nextIndex?: unknown };
              };
              event?: unknown;
              frame?: unknown;
            };
            if (frame?.type === "snapshot") {
              const events = (frame.records ?? [])
                .map((record) => record.event)
                .filter((event) => event !== undefined);
              store.seedWindow(events as never[], normalizeProjections(frame.projections));
              // 重置瞬态基线（对齐上游 ClientAssistantStream.replace，assistant-stream.ts:52-95）。
              durableCursor = -1;
              for (const event of events) durableCursor = Math.max(durableCursor, durableSeq(event));
              transientGap = 0;
              attempt = undefined;
              const baseline = frame.assistantStream?.activeAttempt;
              if (baseline !== undefined && typeof baseline.attemptId !== "undefined") {
                // 重连时后端仍有存活尝试：接管其序号，后续 chunk 继续流出。
                // 注：baseline.stream 中已累积的前缀（compact detached stream）未重建，
                // 重连后的瞬态只从当前帧续显，落定事件到达时会补齐完整文本。
                attempt = {
                  attemptId: String(baseline.attemptId),
                  turn: Number(baseline.turn ?? 0),
                  step: Number(baseline.step ?? 0),
                  nextIndex: typeof baseline.nextIndex === "number" ? baseline.nextIndex : 0,
                };
              }
              return;
            }
            if (frame?.type === "assistant-stream") {
              acceptAssistantFrame(frame.frame);
              return;
            }
            // 增量帧：wire 形状为 {type:'event', event}（SessionEventEntry，contract/events.ts）
            if (frame?.event !== undefined) {
              store.appendEvent(frame.event as never);
              durableCursor = Math.max(durableCursor, durableSeq(frame.event));
              transientGap = 0;
              const kind = (frame.event as { type?: string }).type;
              if (kind === "turn/end" || kind === "turn-error") {
                store.clearTransients();
                attempt = undefined;
                store.settleReply();
              }
            }
          },
          onError: (error) => {
            // 流错误不降级整屏（区别于认证/探测失败）：记控制台，UI 保持当前会话。
            console.error("[dsh-web] session/follow 流错误：", error.code, error.message);
          },
          onEnd: () => {},
        },
      );
    },
    [mux],
  );

  const prompt = useCallback(async (sessionId: string, text: string): Promise<void> => {
    // prompt(request)（index.ts:347）
    await dshRpc("session/prompt", {
      request: {
        requestId: crypto.randomUUID(),
        sessionId,
        mode: "queue",
        content: [{ type: "text", text }],
        clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });
  }, []);

  const fork = useCallback(
    async (sessionId: string): Promise<string> => {
      // fork(request)（index.ts:336）
      const value = await dshRpc<{ sessionId?: string } | string>("session/fork", {
        request: { sessionId },
      });
      const childId = typeof value === "string" ? value : String(value?.sessionId ?? "");
      await refresh();
      return childId;
    },
    [refresh],
  );

  const rename = useCallback(
    async (sessionId: string, title: string): Promise<string> => {
      // rename(request)（index.ts:326）
      const value = await dshRpc<{ title?: string }>("session/rename", {
        request: { sessionId, title },
      });
      await refresh();
      return typeof value?.title === "string" ? value.title : title;
    },
    [refresh],
  );

  // 会话模型选择（2026-09-17）：selectModel(request: SessionSelectModelRequest)
  const selectModel = useCallback(
    async (sessionId: string, provider: string, model: string): Promise<void> => {
      await dshRpc("session/selectModel", { request: { sessionId, provider, model } });
      await refresh();
    },
    [refresh],
  );

  return { status, errorMessage, sessions, connect, refresh, createSession, follow, prompt, fork, rename, selectModel };
}

async function listSessions(): Promise<RemoteSessionRow[]> {
  // list(_request)（index.ts:223）——_request 为保留空请求
  const value = await dshRpc<{ items?: Record<string, unknown>[] }>("session/list", { _request: {} });
  return (value.items ?? []).map(toRow).filter((row) => row.sessionId.length > 0);
}
