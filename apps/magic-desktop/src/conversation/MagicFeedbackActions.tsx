// 消息反馈按钮对（2026-09-17 用户裁定，对齐 Magic 组合 web 端）：「好的回答 / 有问题的回答」
// Like/Dislike，插在轮尾操作行（复制/分支之间，MessageIconActions 的 extraActions 缝）。
// 形态搬自 upstream ui-message-feedback 的 MessageFeedbackActions；M1 简化：本地状态
// toggle + 填满图标（无 session store 读取、无反馈弹窗），SDK 接线后接 controller。
import { useState } from 'react'
import {
  IconDislikeFill16, IconDislikeOutline16, IconLikeFill16, IconLikeOutline16, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './MagicFeedbackActions.module.css'

type Rating = 'positive' | 'negative'

/** 一条消息的反馈控件；已记录的评分显示填满图标，再次点击取消。 */
export function MagicFeedbackActions(): React.JSX.Element {
  const [rating, setRating] = useState<Rating | null>(null)
  const likeLabel = rating === 'positive' ? '取消标记' : '好的回答'
  const dislikeLabel = rating === 'negative' ? '取消标记' : '有问题的回答'
  return (
    <>
      <Tooltip label={likeLabel} side="bottom">
        <button
          type="button"
          className={css.action}
          aria-label={likeLabel}
          aria-pressed={rating === 'positive'}
          data-active={rating === 'positive' || undefined}
          onClick={() => { setRating(value => value === 'positive' ? null : 'positive') }}
        >
          {rating === 'positive' ? <IconLikeFill16 /> : <IconLikeOutline16 />}
        </button>
      </Tooltip>
      <Tooltip label={dislikeLabel} side="bottom">
        <button
          type="button"
          className={css.action}
          aria-label={dislikeLabel}
          aria-pressed={rating === 'negative'}
          data-active={rating === 'negative' || undefined}
          onClick={() => { setRating(value => value === 'negative' ? null : 'negative') }}
        >
          {rating === 'negative' ? <IconDislikeFill16 /> : <IconDislikeOutline16 />}
        </button>
      </Tooltip>
    </>
  )
}
