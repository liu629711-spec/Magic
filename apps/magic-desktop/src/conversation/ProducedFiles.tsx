// 「本次产出」交付文件行（2026-09-17 用户裁定，对齐 Magic 组合 web 端会话区）。
// 形态搬自 upstream ui-deliverables 的 ProducedFiles（label + 可点文件 chips + 余量计数），
// 挂 vendored TurnTailNodeView 预留的 renderTurnTailSlot 缝。
// M1 数据缝：web 端由 deliverablesDefinition（present 工具投影）供数；此处由 ChatFlow
// 从本轮 edit/write 类 tool-call 的 argsRaw 容忍性提取目标路径，SDK 接线后换投影数据。
import { useMemo } from 'react'
import { LinkIcon, classifyLinkPath } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ProducedFiles.module.css'

/** 保留在行内的文件 chips 上限（upstream 同值）。 */
const SHOWN_LIMIT = 6

function basename(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
}

/** 「本次产出」行：本轮产出的文件 chips（无产出不渲染由调用方 gate）。 */
export function ProducedFiles({ matched: paths, onOpenFile }: {
  matched: readonly string[]
  onOpenFile: (path: string) => void
}) {
  const shown = useMemo(() => paths.slice(0, SHOWN_LIMIT), [paths])
  return (
    <div className={css.root} data-produced-files>
      <span className={css.label}>本次产出</span>
      <div className={css.row}>
        {shown.map(path => (
          <button
            key={path}
            type="button"
            className={css.file}
            title={path}
            onClick={() => { onOpenFile(path) }}
          >
            <LinkIcon kind={classifyLinkPath(path)} className={css.fileIcon} />
            <span className={css.fileName}>{basename(path)}</span>
          </button>
        ))}
        {paths.length > SHOWN_LIMIT && (
          <span className={css.more}>{`+ ${String(paths.length - SHOWN_LIMIT)} 个文件`}</span>
        )}
      </div>
    </div>
  )
}
