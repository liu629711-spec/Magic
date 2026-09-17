// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/models/ask-question-card-model.ts

interface AnsweredQuestionCardItem {
  id: string
  question: string
  answers: readonly string[]
}

interface UnansweredQuestionCardItem {
  id: string
  question: string
}

/** 由 ask-user 转录卡渲染的已校验、已本地化数据。 */
export type AskQuestionCardModel =
  | {
    kind: 'answered'
    questions: readonly AnsweredQuestionCardItem[]
    skippedLabel: string
  }
  | {
    kind: 'unanswered'
    questions: readonly UnansweredQuestionCardItem[]
    verdict: string
  }
