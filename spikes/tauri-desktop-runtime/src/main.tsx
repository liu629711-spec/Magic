import { invoke } from "@tauri-apps/api/core"
import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

type RuntimeStatus = {
  magic_url: string
  magic_healthy: boolean
  opencode_url: string
  opencode_healthy: boolean
  magic_pid: number | null
  opencode_pid: number | null
}

const initialStatus: RuntimeStatus = {
  magic_url: "http://127.0.0.1:45173",
  magic_healthy: false,
  opencode_url: "http://127.0.0.1:45174",
  opencode_healthy: false,
  magic_pid: null,
  opencode_pid: null,
}

function App() {
  const [status, setStatus] = useState<RuntimeStatus>(initialStatus)
  const [message, setMessage] = useState("正在连接本地运行时...")
  const [busy, setBusy] = useState(false)

  async function refresh() {
    try {
      const next = await invoke<RuntimeStatus>("bootstrap")
      setStatus(next)
      setMessage("Tauri 桌面层已连接，本地服务状态已读取")
    } catch (error) {
      setMessage(`连接失败：${String(error)}`)
    }
  }

  async function stop() {
    setBusy(true)
    try {
      await invoke("stop_processes")
      setMessage("Spike 子进程已停止")
      setStatus(initialStatus)
    } catch (error) {
      setMessage(`停止失败：${String(error)}`)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <main>
      <header>
        <p className="eyebrow">MAGIC / DESKTOP RUNTIME SPIKE</p>
        <h1>Tauri 运行链路验证</h1>
        <p className="lede">确认桌面层能安全发现或启动本地 TypeScript 服务与 OpenCode V1。</p>
      </header>

      <section className="status-grid" aria-label="运行状态">
        <StatusCard label="Magic 本地服务" url={status.magic_url} healthy={status.magic_healthy} pid={status.magic_pid} />
        <StatusCard label="OpenCode V1" url={status.opencode_url} healthy={status.opencode_healthy} pid={status.opencode_pid} />
      </section>

      <section className="actions">
        <button type="button" onClick={() => void refresh()} disabled={busy}>
          刷新并发现服务
        </button>
        <button type="button" className="secondary" onClick={() => void stop()} disabled={busy}>
          停止 Spike 进程
        </button>
      </section>

      <p className="message" role="status">{message}</p>
      <p className="note">关闭窗口不会由渲染层发出取消命令；重新打开时会重新探测固定端口。这只是生命周期验证，不代表最终 Worker 策略。</p>
    </main>
  )
}

function StatusCard({ label, url, healthy, pid }: { label: string; url: string; healthy: boolean; pid: number | null }) {
  return (
    <article className="status-card">
      <div className="status-heading">
        <h2>{label}</h2>
        <span className={healthy ? "badge healthy" : "badge"}>{healthy ? "健康" : "未连接"}</span>
      </div>
      <p>{url}</p>
      <small>{pid === null ? "已发现的外部进程或尚未启动" : `由本次 Spike 启动，PID ${pid}`}</small>
    </article>
  )
}

createRoot(document.getElementById("root")!).render(<App />)
