// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/ToolCallTree.tsx
// （剥离：renderSlot('tool.call.toolview') 键控分发改为可选 renderToolview
// prop，缺省/未命中时直接渲染 GenericToolCard；useHostInfo 注入 hook 改为
// 纯 prop home。其余渲染逻辑零改动。）

/** Root/subcall Tool composition with one keyed atomic dispatch path. */
import { memo, useMemo, type ReactNode } from 'react'
import type { ToolCallBlock } from '../vendor-types.ts'
import type { ToolCallOwnerProps, ToolTreeProps } from './slots.ts'
import { GenericToolCard } from './toolviews/GenericToolCard.tsx'
import css from './ToolCallTree.module.css'

/** 从两种生命周期形态解析 Tool 调用的 wire 名。 */
function callName(node: ToolCallBlock): string {
  return 'kind' in node ? node.call?.name ?? '' : node.name
}

/** 经 Tool 拥有的键控插槽分发的一个原子调用。 */
const ToolCall = memo(function ToolCall({
  renderToolview, callId, toolName, block, openFile, cwd, home, inspectCall, loadImage, t, children,
}: Pick<ToolTreeProps, 'renderToolview' | 'openFile' | 'cwd' | 'inspectCall' | 'loadImage' | 't'> & {
  callId: string
  toolName: string
  block: ToolCallBlock
  home?: string | undefined
  children?: ReactNode
}) {
  const owner: ToolCallOwnerProps = useMemo(() => ({
    callId,
    toolName,
    block,
    openFile,
    cwd,
    home,
    loadImage,
    inspect: () => { inspectCall(callId) },
  }), [callId, toolName, block, openFile, cwd, home, loadImage, inspectCall])
  const custom = renderToolview?.(owner)
  return (
    <div
      className={css.callRow}
      data-chat-anchor-key={`call:${callId}`}
      data-chat-call-id={callId}
    >
      {custom !== undefined && custom !== null ? custom : <GenericToolCard {...owner} t={t} />}
      {children}
    </div>
  )
})

const ToolCallBranch = memo(function ToolCallBranch({
  renderToolview, block, cwd, home, openFile, inspectCall, loadImage, t,
}: Pick<ToolTreeProps, 'renderToolview' | 'cwd' | 'openFile' | 'inspectCall' | 'loadImage' | 't'> & {
  block: ToolCallBlock
  home?: string | undefined
}) {
  return (
    <ToolCall
      renderToolview={renderToolview}
      callId={block.callId}
      toolName={callName(block)}
      block={block}
      openFile={openFile}
      cwd={cwd}
      home={home}
      inspectCall={inspectCall}
      loadImage={loadImage}
      t={t}
    >
      {block.subCalls.length > 0 ? (
        <div className={css.subCalls} data-subcalls>
          {block.subCalls.map(child => (
            <ToolCallBranch
              key={child.callId}
              renderToolview={renderToolview}
              block={child}
              cwd={cwd}
              home={home}
              openFile={openFile}
              inspectCall={inspectCall}
              loadImage={loadImage}
              t={t}
            />
          ))}
        </div>
      ) : null}
    </ToolCall>
  )
})

/** 经同一原子键控分发渲染一个根 Tool 调用及其递归子调用。 */
export function ToolCallTree({
  renderToolview, node, cwd, home, openFile, inspectCall, loadImage, t,
}: ToolTreeProps) {
  const block = node.data.root
  return (
    <ToolCallBranch
      renderToolview={renderToolview}
      block={block}
      cwd={cwd}
      home={home}
      openFile={openFile}
      inspectCall={inspectCall}
      loadImage={loadImage}
      t={t}
    />
  )
}
