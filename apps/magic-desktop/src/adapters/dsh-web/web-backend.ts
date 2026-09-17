// 会话域适配 + React 接入 hook（SDK 接线 M1）。
// 契约源自 session-controller（packages/api/session-controller）：
// - session/list   args {}            → {items: SessionSummary[]}（manager.ts:462）
// - session/create args {cwd?}        → SessionId（ISessions.create）
// - session/prompt args {requestId,sessionId,mode,content,clientTimeZone}（session.ts:249-255）
// - session/rename args {sessionId,title} → {title,seq}（session.ts:358）
// - session/fork   args {sessionId}   → {sessionId}（manager.ts:599-602）
// - session/follow 流 args {address:{kind:'session',sessionId},assistantStream:true}：
//   item = {type:'snapshot',records:[{type:'event',event}],hasMore,...} | {type:'entry',event}
//        | {type:'assistant-stream',frame}（transport.ts:172-220）；event 即 SessionEvent，
//          与 vendor/dsh-chat 折叠层契约完全一致（server.ts:95-98）。
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatSessionStore } from "../../conversation/chat-store";
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
  };
}

export type WebBackendStatus = "disabled" | "probing" | "need-auth" | "ready" | "error";

export function useWebBackend(enabled: boolean): {
  status: WebBackendStatus;
  errorMessage: string;
  sessions: RemoteSessionRow[];
  connect: (tokenInput: string) => Promise<void>;
  refresh: () => Promise<void>;
  createSession: () => Promise<string>;
  follow: (sessionId: string, store: ChatSessionStore) => () => void;
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
    (sessionId: string, store: ChatSessionStore): (() => void) => {
      return mux().open(
        "session/follow",
        // 流 open 帧的 payload = {args}，args 按描述符形参名（follow(request)）
        { args: { request: { address: { kind: "session", sessionId }, assistantStream: true } } },
        {
          onItem: (value) => {
            const frame = value as {
              type?: string;
              records?: Array<{ event?: unknown }>;
              event?: unknown;
              frame?: unknown;
            };
            if (frame?.type === "snapshot") {
              const events = (frame.records ?? [])
                .map((record) => record.event)
                .filter((event) => event !== undefined);
              store.seedWindow(events as never[]);
              return;
            }
            if (frame?.type === "assistant-stream") return; // 流式瞬态：M1 渲染结算事件，瞬态帧暂不进流
            // 增量帧：wire 形状为 {type:'event', event}（SessionEventEntry，contract/events.ts）
            if (frame?.event !== undefined) {
              store.appendEvent(frame.event as never);
              const kind = (frame.event as { type?: string }).type;
              if (kind === "turn/end" || kind === "turn-error") store.settleReply();
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
