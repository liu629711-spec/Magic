// vendored from @deepseek-ai/dsh-client-ui-tool@0.1.5-rc.2 client/tool/components/AskQuestionCard.tsx

import type { AskQuestionCardModel } from '../models/ask-question-card-model.ts'
import css from './AskQuestionCard.module.css'

/** 由纯卡数据渲染已校验的 ask-user 转录。 */
export function AskQuestionCard({ card }: { card: AskQuestionCardModel }) {
  if (card.kind === 'unanswered') {
    return (
      <div className={css.card}>
        <p className={css.verdict}>{card.verdict}</p>
        <ul className={css.questionList}>
          {card.questions.map(question => (
            <li className={css.unansweredQuestion} key={question.id}>{question.question}</li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <dl className={css.card}>
      {card.questions.map(question => (
        <div className={css.item} key={question.id}>
          <dt className={css.question}>{question.question}</dt>
          <dd className={css.answer}>
            {question.answers.length === 0
              ? <span className={css.skipped}>{card.skippedLabel}</span>
              : question.answers.map((answer, index) => (
                <span className={css.answerLine} key={`${question.id}-${String(index)}`}>{answer}</span>
              ))}
          </dd>
        </div>
      ))}
    </dl>
  )
}
