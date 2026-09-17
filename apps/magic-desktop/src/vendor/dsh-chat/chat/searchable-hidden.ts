// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/searchable-hidden.ts

import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/** 不卸载稳定子树的前提下应用可搜索隐藏态。 */
export function useSearchableHidden(
  hidden: boolean,
  reveal: () => void,
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (element === null) return
    if (hidden && element.contains(element.ownerDocument.activeElement)) {
      reveal()
      return
    }
    if (hidden) element.setAttribute('hidden', 'until-found')
    else element.removeAttribute('hidden')
  }, [hidden, reveal])
  useEffect(() => {
    const element = ref.current
    if (element === null) return
    element.addEventListener('beforematch', reveal)
    return () => { element.removeEventListener('beforematch', reveal) }
  }, [reveal])
  return ref
}
