// 替代 @deepseek-ai/dsh-spill-policy/notice 的 hasSpillNotice，行为等价。
// （describeOmitted 的 'bytes' 单位拼写内联自 @deepseek-ai/dsh-output-retention：
//   '' / `Omitted ${count} bytes.` / 'More bytes were omitted.'。）

const OPEN = '('
const CLOSE = ')'
const LOCATION = ' Full formatted result stored at: '
const GUIDANCE_SEPARATOR = '. '
const SEPARATOR = '\n\n'
const EXACT_OMISSION = 'Omitted 0 bytes.'
const COUNT_OFFSET = EXACT_OMISSION.indexOf('0')
const COUNT_SUFFIX = EXACT_OMISSION.slice(COUNT_OFFSET + 1)

function isOmission(text: string): boolean {
  if (text === '' || text === 'More bytes were omitted.') return true
  const count = Number(text.slice(COUNT_OFFSET, text.length - COUNT_SUFFIX.length))
  return Number.isSafeInteger(count) && count >= 0
    && text === `Omitted ${count} bytes.`
}

/** 识别持久文本结尾的完整溢出通知（含纯通知输出）。 */
export function hasSpillNotice(text: string): boolean {
  if (!text.endsWith(CLOSE)) return false
  let start = 0
  while (true) {
    const next = text.indexOf(`${SEPARATOR}${OPEN}`, start)
    const candidate = text.slice(start, next < 0 ? -CLOSE.length : next)
    const location = candidate.indexOf(LOCATION, OPEN.length)
    if (candidate.startsWith(OPEN) && location >= 0
      && isOmission(candidate.slice(OPEN.length, location))) {
      return text.indexOf(GUIDANCE_SEPARATOR, start + location + LOCATION.length) >= 0
    }
    if (next < 0) return false
    start = next + SEPARATOR.length
  }
}
