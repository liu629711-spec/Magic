// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/CommandNodeView.tsx
// （剥离：renderSlot('conversation.chat.commandview') 键控分发收敛为可选纯
// prop renderCommandview（owner + entryKey），返回 undefined/null 时回退
// GenericCommandCard——模式同 tool/ToolCallTree.tsx 的 renderToolview。
// css.callRow 收敛进 CommandNodeView.module.css（源自 ChatView.module.css）。
// 其余渲染逻辑零改动。）

import { memo, useMemo, type ReactNode } from 'react'
import type { ChatNodeViewProps, CommandRowOwnerProps } from '../contract/slots.ts'
import { CompactionCommandCard } from './CompactionCommandCard.tsx'
import { GenericCommandCard } from './GenericCommandCard.tsx'
import css from './CommandNodeView.module.css'

/** 普通指令行渲染器 props：ChatNodeViewProps 外加可选键控分发。 */
export interface CommandNodeViewProps extends ChatNodeViewProps<'command'> {
  /** 指令名键控分发（原 renderSlot('conversation.chat.commandview')）。 */
  renderCommandview?: ((owner: CommandRowOwnerProps, entryKey: string) => ReactNode | null | undefined) | undefined
}

/** Ordinary command lifecycle renderer with command-name keyed specialization. */
export const CommandNodeView = memo(function CommandNodeView({ node, renderCommandview, t }: CommandNodeViewProps) {
  const command = node.data
  const owner = useMemo<CommandRowOwnerProps>(() => ({ node: command }), [command])
  const custom = renderCommandview?.(owner, command.name ?? '')
  return (
    <div className={css.callRow}>
      {custom !== undefined && custom !== null ? custom : <GenericCommandCard {...owner} t={t} />}
    </div>
  )
})

/** One integrated `/compact` command and compaction transaction renderer. */
export const ManualCompactionNodeView = memo(function ManualCompactionNodeView({
  node, t,
}: ChatNodeViewProps<'manual-compaction'>) {
  const data = node.data
  return (
    <div className={css.callRow}>
      <CompactionCommandCard
        node={data.command}
        {...data.compaction === null ? {} : { compaction: data.compaction }}
        t={t}
      />
    </div>
  )
})
