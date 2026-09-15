import { createElement as h, Fragment, type ReactNode } from 'react'
import { MemberAvatar } from './MemberAvatar.ts'
import { ink } from './theme.ts'

/** 成员观察面 chip：圆形线框人像 + 当前成员名 / 团队总览。 */
export function MemberTabTitle({
  useTabInfo,
}: {
  useTabInfo: () => { tab: { title: string } }
}): ReactNode {
  const { tab } = useTabInfo()
  return h(Fragment, null,
    h(MemberAvatar, { size: 16, color: ink.tertiary }),
    tab.title,
  )
}
