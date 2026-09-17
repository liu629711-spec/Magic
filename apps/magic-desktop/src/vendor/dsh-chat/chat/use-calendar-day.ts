// vendored from @deepseek-ai/dsh-client-ui-chat@0.1.5-rc.2 client/chat/use-calendar-day.ts

import { useEffect, useState } from 'react'
import { msUntilNextLocalMidnight, startOfLocalDay } from './message-chrome.ts'

/** 随每个本地午夜推进的本地日历日纪元。 */
export function useCalendarDay(): number {
  const [day, setDay] = useState(() => startOfLocalDay(Date.now()))
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const arm = (): void => {
      const now = Date.now()
      setDay(startOfLocalDay(now))
      timer = setTimeout(arm, msUntilNextLocalMidnight(now))
    }
    timer = setTimeout(arm, msUntilNextLocalMidnight(Date.now()))
    return () => { clearTimeout(timer) }
  }, [])
  return day
}
