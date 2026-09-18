import { useEffect, useRef, useState } from 'react'
import type { RemoteSessionRow } from '../adapters/dsh-web/web-backend'
import { RemoteMux } from '../adapters/dsh-web/mux'
import { ChatSessionStore } from '../conversation/chat-store'
import { ChatFlow } from '../conversation/ChatFlow'
import { api, type SessionScope } from '../vendor/better-sidebar/api'
import type { SidebarStore } from '../vendor/better-sidebar/state'
import { normalizeBrowserUrl, embeddabilityOf } from '../vendor/better-sidebar/browser'

export interface DockSessionBridge {
  sessions: RemoteSessionRow[]
  fork: (id: string) => Promise<string>
  follow: (id: string, store: ChatSessionStore, parentId?: string) => () => void
  prompt: (id: string, text: string) => Promise<void>
  selectModel: (id: string, provider: string, model: string) => Promise<void>
  openSession: (id: string) => void
}
const button = 'rounded px-2 py-1 text-xs text-on-surface-variant hover:bg-surface-container-high active:bg-surface-container-highest focus-visible:outline focus-visible:outline-primary disabled:opacity-40 disabled:cursor-not-allowed'
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e)

/** BrowserView 的地址策略和 browser.probe 通道，保留不授予 same-origin 的沙箱。 */
export function DockBrowser({ store }: { store: SidebarStore }) {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [cursor, setCursor] = useState(-1)
  const [reload, setReload] = useState(0)
  const [error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const url = history[cursor]
  useEffect(() => {
    if (!url) return
    let cancelled = false
    setLoading(true); setBlocked(false); setError(null)
    void api.browserProbe(url).then(probe => {
      if (cancelled) return
      setBlocked(embeddabilityOf(probe) === 'blocked')
      if (!probe.reachable) setError('无法连接此地址，请重试或在外部浏览器打开。')
    }).catch(e => { if (!cancelled) setError(errorText(e)) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [url, reload])
  const navigate = () => {
    const result = normalizeBrowserUrl(input, window.location.origin, store.getPrefs().browserAllowedLoopback)
    if (result.kind !== 'ok') { setError(result.kind === 'invalid' ? '请输入有效网址' : '此地址不在允许的浏览范围内'); return }
    setHistory(prev => [...prev.slice(0, cursor + 1), result.url]); setCursor(cursor + 1); setInput(result.url)
  }
  return <div className="flex-1 min-h-0 flex flex-col">
    <form className="flex gap-1 items-center p-2 border-b border-surface-container-highest" onSubmit={e => { e.preventDefault(); navigate() }}>
      <button type="button" className={button} aria-label="后退" disabled={cursor <= 0} onClick={() => { setInput(history[cursor-1]); setCursor(cursor-1) }}>←</button>
      <button type="button" className={button} aria-label="前进" disabled={cursor >= history.length-1} onClick={() => { setInput(history[cursor+1]); setCursor(cursor+1) }}>→</button>
      <input aria-label="浏览器地址" value={input} onChange={e => setInput(e.target.value)} placeholder="输入网址" className="min-w-0 flex-1 rounded border border-surface-container-highest bg-surface px-2 py-1 text-xs" />
      <button className={button} type="submit">前往</button>
      <button className={button} type="button" disabled={!url} onClick={() => setReload(v=>v+1)}>刷新</button>
    </form>
    {!url ? <p className="m-auto text-sm text-outline">输入网址开始浏览</p> : <>
      <div className="flex justify-between px-3 py-1 text-xs text-outline"><span>受保护的网页预览</span><a className={button} href={url} target="_blank" rel="noopener noreferrer">外部打开</a></div>
      {loading ? <p className="p-4 text-xs text-outline">正在连接…</p> : error || blocked ? <div role="status" className="p-4 text-sm text-outline">{error ?? '此网站不允许嵌入，请在外部浏览器打开。'}<button type="button" className={button} onClick={()=>setReload(v=>v+1)}>重试</button></div> : <iframe key={`${url}:${reload}`} title={url} src={url} sandbox="allow-scripts allow-forms allow-popups allow-downloads allow-modals allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" className="w-full flex-1 min-h-0 border-0" />}
    </>}
  </div>
}

interface Job { id: string; label: string; status: string; kind: string; detail?: string }
type ControlFrame = { type: 'baseline'; value: { jobs: Record<string, Job[]> } } | { type: 'jobs'; sessionId: string; jobs: Job[] }
/** session/control 为只读状态流，输出沿用插件 jobs.output（不会消费模型游标）。 */
export function DockJobs({ scope, bridge }: { scope: SessionScope; bridge: DockSessionBridge }) {
  const [jobs, setJobs] = useState<Record<string, Job[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [retry, setRetry] = useState(0)
  const [output, setOutput] = useState<string|null>(null)
  const outputSeq = useRef(0)
  useEffect(() => {
    setLoading(true); setError(null)
    const mux = new RemoteMux()
    mux.open('session/control', {args:{}}, {
      onItem: value => {
        const frame = value as ControlFrame
        if (frame.type === 'baseline') { setJobs(frame.value.jobs); setLoading(false) }
        else if (frame.type === 'jobs') setJobs(prev=>({...prev,[frame.sessionId]:frame.jobs}))
      },
      onError: e=>{setError(e.message);setLoading(false)},
      onEnd: ()=>{setError('任务状态连接已结束，请重试');setLoading(false)},
    })
    return ()=>{mux.dispose();outputSeq.current++}
  }, [retry])
  const ids = new Set([scope.sessionId])
  let changed = true
  while (changed) { changed=false; for (const row of bridge.sessions) if(row.parentSessionId && ids.has(row.parentSessionId) && !ids.has(row.sessionId)){ids.add(row.sessionId);changed=true} }
  const children = bridge.sessions.filter(row=>row.sessionId!==scope.sessionId && ids.has(row.sessionId))
  const rows = [...ids].flatMap(id=>(jobs[id]??[]).map(job=>({job,owner:id})))
  return <div className="flex-1 min-h-0 overflow-auto p-3 text-sm">
    <div className="flex justify-between items-center"><h2>任务管理</h2><button className={button} onClick={()=>setRetry(v=>v+1)}>刷新</button></div>
    {loading ? <p className="py-4 text-outline">加载任务…</p> : error ? <p role="alert" className="py-4 text-error">{error}<button className={button} onClick={()=>setRetry(v=>v+1)}>重试</button></p> : null}
    <h3 className="mt-4 mb-2 text-xs text-outline">子代理 · {children.length}</h3>
    {children.length===0 && <p className="text-xs text-outline">当前会话没有子代理</p>}
    {children.map(row=><button key={row.sessionId} className={`${button} block w-full text-left truncate`} onClick={()=>bridge.openSession(row.sessionId)}>{row.title}</button>)}
    <h3 className="mt-4 mb-2 text-xs text-outline">后台任务 · {rows.length}</h3>
    {!loading && !error && rows.length===0 && <p className="text-xs text-outline">暂无后台任务；智能体创建的任务会显示在这里。</p>}
    {rows.map(({job,owner})=><button key={`${owner}:${job.id}`} className={`${button} flex w-full justify-between gap-2 text-left`} onClick={()=>{const seq=++outputSeq.current;setOutput('正在读取输出…');void api.jobOutput({sessionId:owner},job.id).then(v=>{if(seq===outputSeq.current)setOutput(v.text || (v.read?'暂无输出':'智能体尚未读取此任务输出'))}).catch(e=>{if(seq===outputSeq.current)setOutput(errorText(e))})}}><span className="truncate">{job.label}</span><span>{job.status}</span></button>)}
    {output!==null && <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs border border-surface-container-highest p-3">{output}</pre>}
  </div>
}

/** 复用 sidenote 的 session fork 语义；仅用户明确点击创建时 fork，不自动发送模型任务。 */
export function DockSideChat({scope,bridge,onOpenFile}:{scope:SessionScope;bridge:DockSessionBridge;onOpenFile:(path:string)=>void}) {
  const [child,setChild] = useState<string|null>(null)
  const [store] = useState(()=>new ChatSessionStore())
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState<string|null>(null)
  const [pending,setPending] = useState<string|null>(null)
  const alive=useRef(true)
  useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[])
  useEffect(()=>child?bridge.follow(child,store):undefined,[child,bridge.follow,store])
  const create=async()=>{
    setBusy(true);setError(null)
    try {
      const id=await bridge.fork(scope.sessionId)
      if(!id)throw new Error('宿主未返回侧边会话')
      const parent=bridge.sessions.find(s=>s.sessionId===scope.sessionId)
      if(parent?.model)await bridge.selectModel(id,parent.model.provider,parent.model.model)
      if(alive.current)setChild(id)
    }catch(e){if(alive.current)setError(errorText(e))}finally{if(alive.current)setBusy(false)}
  }
  const send=(text:string)=>{if(!child)return;setPending(text);setError(null);void bridge.prompt(child,text).then(()=>setPending(null)).catch(e=>setError(errorText(e)))}
  return <div className="flex-1 min-h-0 flex flex-col">
    {error && <div role="alert" className="p-3 text-xs text-error">{error}<button className={button} onClick={()=>pending?send(pending):void create()}>重试</button></div>}
    {child ? <><div className="px-3 py-2 flex justify-between text-xs text-outline"><span>侧边聊天 · 继承主会话历史</span><button className={button} onClick={()=>bridge.openSession(child)}>打开会话</button></div><div className="flex-1 min-h-0"><ChatFlow store={store} sessionId={child} cwd={scope.cwd} onSend={send} onOpenFile={onOpenFile}/></div></> : <div className="m-auto flex flex-col items-center gap-3 p-4 text-sm text-outline"><p>从当前会话分叉，独立讨论并保留主线。</p><button className={button} disabled={busy} onClick={()=>void create()}>{busy?'正在创建…':'创建侧边聊天'}</button></div>}
  </div>
}
