// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/conversation-nodes/partial.ts

import type { StreamChunk } from '../vendor-types.ts'
import type {
  AssistantBlock, PartialAssistant,
} from '../vendor-types.ts'
import { emptyAssistantBlock, toAssistantBlock } from './event-projection.ts'

/** 测试一个流块是否改变 UI 展示的 partial assistant 投影。 */
export function isVisibleAssistantChunk(type: string): boolean {
  return type === 'block-start'
    || type === 'text-delta'
    || type === 'reasoning-delta'
    || type === 'tool-call-delta'
    || type === 'block-end'
}

/** 实时 Assistant 帧累加器：以块级不可变性把 StreamChunk 折叠进 AssistantBlock[]。 */
export class PartialAccumulator {
  // Sparse on purpose: block-start may arrive out of order, leaving holes until compaction.
  private blocks: (AssistantBlock | undefined)[] = []
  private changed = true
  private snapshot: PartialAssistant

  constructor(
    readonly turn: number,
    readonly step: number,
    initialBlocks: readonly AssistantBlock[] = [],
  ) {
    this.blocks = [...initialBlocks]
    this.snapshot = { turn, step, blocks: initialBlocks }
  }

  /** 折叠一个块。usage/finish 返回 false（跳过通知）。 */
  push(chunk: StreamChunk): boolean {
    switch (chunk.type) {
      case 'block-start': {
        this.blocks[chunk.index] = emptyAssistantBlock(chunk.blockType)
        this.changed = true
        return true
      }
      case 'text-delta': {
        const prev = this.blocks[chunk.index]
        this.blocks[chunk.index] = { kind: 'text', text: (prev?.kind === 'text' ? prev.text : '') + chunk.text }
        this.changed = true
        return true
      }
      case 'reasoning-delta': {
        const prev = this.blocks[chunk.index]
        this.blocks[chunk.index] = { kind: 'reasoning', text: (prev?.kind === 'reasoning' ? prev.text : '') + chunk.text }
        this.changed = true
        return true
      }
      case 'tool-call-delta': {
        const prev = this.blocks[chunk.index]
        const base = prev?.kind === 'tool-call' ? prev : { kind: 'tool-call' as const, callId: '', name: '', argsRaw: '' }
        this.blocks[chunk.index] = {
          kind: 'tool-call',
          callId: base.callId || String(chunk.id),
          name: chunk.name ?? base.name,
          argsRaw: base.argsRaw + chunk.argumentsDelta,
        }
        this.changed = true
        return true
      }
      case 'block-end': {
        this.blocks[chunk.index] = toAssistantBlock(chunk.block)
        this.changed = true
        return true
      }
      default:
        return false
    }
  }

  /** 当前 partial 投影。 */
  toPartial(): PartialAssistant {
    if (this.changed) {
      this.snapshot = { turn: this.turn, step: this.step, blocks: this.blocks.filter((b): b is AssistantBlock => b !== undefined) }
      this.changed = false
    }
    return this.snapshot
  }
}
