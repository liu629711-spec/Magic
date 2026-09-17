// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/toolviews/ask-question-row.tsx
// （剥离注册壳：askQuestionToolview 的 ctx.slots.inject + register 整体移除，
// 仅保留 AskQuestionRow 卡片本体。）

import { IconQuestionOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '../slots.ts'
import type { AskQuestionCardModel } from '../models/ask-question-card-model.ts'
import { singleResultText } from '../models/raw-tool-call.ts'
import { toolRowModel } from '../models/tool-call-model.ts'
import { ToolRow } from '../components/ToolRow.tsx'

/** 转录卡使用的字段校验后的一个结果条目。 */
interface AnswerEntry {
  id: string
  selected: string[]
  custom?: string
}

/** 转录卡使用的字段校验后的一个问题。 */
interface QuestionEntry {
  id: string
  question: string
}

/** 一对问题及其可见回答行。 */
interface AnsweredQuestion {
  id: string
  question: string
  answers: string[]
}

interface AnswerPresentation {
  summary: string
  questions: AnsweredQuestion[] | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** 结果 JSON 的回答记录；结果畸形时为 null。 */
function answerEntries(text: string): AnswerEntry[] | null {
  const parsed = parseJson(text)
  if (!isRecord(parsed)) return null
  const answers = parsed.answers
  if (!Array.isArray(answers) || !answers.every(isRecord)) return null
  const entries: AnswerEntry[] = []
  for (const answer of answers) {
    if (typeof answer.id !== 'string'
      || !Array.isArray(answer.selected)
      || !answer.selected.every(item => typeof item === 'string')
      || (answer.custom !== undefined && typeof answer.custom !== 'string')) return null
    entries.push({
      id: answer.id,
      selected: answer.selected,
      ...(answer.custom === undefined ? {} : { custom: answer.custom }),
    })
  }
  return entries
}

/** 调用 JSON 的问题；配对将含歧义时为 null。 */
function questionEntries(argsRaw: string): QuestionEntry[] | null {
  const parsed = parseJson(argsRaw)
  if (!isRecord(parsed) || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null
  const questions: QuestionEntry[] = []
  const ids = new Set<string>()
  for (const question of parsed.questions) {
    if (!isRecord(question)
      || typeof question.id !== 'string'
      || typeof question.question !== 'string'
      || ids.has(question.id)) return null
    ids.add(question.id)
    questions.push({ id: question.id, question: question.question })
  }
  return questions
}

/** 以回显的稳定 id 配对问题与结果条目。 */
function pairAnswers(argsRaw: string, answers: AnswerEntry[]): AnsweredQuestion[] | null {
  const questions = questionEntries(argsRaw)
  if (questions === null || questions.length !== answers.length) return null
  const byId = new Map<string, AnswerEntry>()
  for (const answer of answers) {
    if (byId.has(answer.id)) return null
    byId.set(answer.id, answer)
  }
  const paired: AnsweredQuestion[] = []
  for (const question of questions) {
    const answer = byId.get(question.id)
    if (answer === undefined) return null
    paired.push({
      ...question,
      answers: [
        ...answer.selected,
        ...(answer.custom === undefined || answer.custom === '' ? [] : [answer.custom]),
      ],
    })
  }
  return paired
}

/** 两份 wire JSON 文档的答案摘要加结构化转录内容。 */
function answeredPresentation(
  argsRaw: string,
  text: string,
  t: ToolCallViewProps['t'],
): AnswerPresentation | null {
  const answers = answerEntries(text)
  if (answers === null) return null
  const answered = answers.filter(answer => answer.selected.length > 0 || (answer.custom ?? '') !== '').length
  return {
    summary: t('ask.answered', { answered, total: answers.length }),
    questions: pairAnswers(argsRaw, answers),
  }
}

/** 严格转录配对失败时的尽力回答计数摘要。 */
function answeredSummary(text: string, t: ToolCallViewProps['t']): string | null {
  const parsed = parseJson(text)
  if (!isRecord(parsed)) return null
  const answers = parsed.answers
  if (!Array.isArray(answers) || !answers.every(isRecord)) return null
  const answered = answers.filter(a =>
    (Array.isArray(a.selected) && a.selected.length > 0)
    || (typeof a.custom === 'string' && a.custom !== '')).length
  return t('ask.answered', { answered, total: answers.length })
}

/** Summarizes a pending, answered, cancelled, or interrupted question set. */
export function AskQuestionRow({ toolName, block, inspect, t }: ToolCallViewProps) {
  const model = toolRowModel(toolName, block)
  const code = 'kind' in block ? block.error?.code : undefined
  const argsRaw = ('kind' in block ? block.call?.argsRaw : block.argsRaw) ?? ''
  let summary = model.summary
  let state = model.state
  let transcript: AskQuestionCardModel | null = null
  if (code === 'ASK_CANCELLED') {
    summary = t('ask.cancelled')
    state = 'ok'
    const questions = questionEntries(argsRaw)
    if (questions !== null) {
      transcript = { kind: 'unanswered', questions, verdict: t('ask.cancelledDetail') }
    }
  } else if (code === 'ASK_ABORTED') {
    summary = t('ask.interrupted')
    state = 'stopped'
    const questions = questionEntries(argsRaw)
    if (questions !== null) {
      transcript = { kind: 'unanswered', questions, verdict: t('ask.interruptedDetail') }
    }
  } else if (model.state === 'running') {
    summary = t('ask.waiting')
  } else if ('kind' in block && model.state === 'ok') {
    const text = singleResultText(block)
    if (text !== undefined) {
      const presentation = answeredPresentation(argsRaw, text, t)
      summary = presentation?.summary ?? answeredSummary(text, t) ?? model.summary
      if (presentation?.questions !== null && presentation?.questions !== undefined) {
        transcript = { kind: 'answered', questions: presentation.questions, skippedLabel: t('ask.skipped') }
      }
    }
  }
  return (
    <ToolRow
      t={t}
      variant={model.variant}
      toolName={toolName}
      icon={<IconQuestionOutline14 />}
      title={t('ask.rowTitle')}
      summary={summary}
      bodyRaw={transcript === null ? model.bodyRaw : null}
      output={transcript === null ? model.output : null}
      askQuestion={transcript}
      state={state}
      inspect={inspect}
    />
  )
}
