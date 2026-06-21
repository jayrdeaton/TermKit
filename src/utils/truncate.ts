import { config } from '@/config'

import { stringLength } from './stringLength'

const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g
const RESET = '\x1b[0m'

export function truncate(str: string, maxLength: number, suffix = config.glyphs ? '…' : '...'): string {
  if (stringLength(str) <= maxLength) return str
  const hasAnsi = ANSI_RE.test(str)
  ANSI_RE.lastIndex = 0
  const suffixLen = stringLength(suffix)
  const target = Math.max(0, maxLength - suffixLen)

  let visible = 0
  let i = 0
  while (i < str.length && visible < target) {
    if (str[i] === '\x1b') {
      const m = str.slice(i).match(ANSI_RE)
      if (m) {
        i += m[0].length
        continue
      }
    }
    visible++
    i++
  }

  return str.slice(0, i) + (hasAnsi ? RESET : '') + suffix
}
