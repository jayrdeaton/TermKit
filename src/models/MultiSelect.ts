import { config } from '@/config'
import { registerCleanup } from '@/utils/cleanup'
import { applyShimmer, BLUE, colorText, DISABLE_WRAP, ENABLE_WRAP, formatColor, HIDE_CURSOR, interpolateColor, parseHex, RED, RESET, resolveColor, type RgbColor, SHIMMER_SPEED, SHOW_CURSOR } from '@/utils/color'
import { stringLength } from '@/utils/stringLength'

export interface MultiSelectItem {
  label: string
  description?: string
}

export interface MultiSelectOptions {
  min?: number
  max?: number
  allowSkip?: boolean
  promptColor?: string
  promptGlyph?: string
  descriptionColor?: string
  errorColor?: string
  checkedPrefix?: string
  uncheckedPrefix?: string
  colors?: string[]
  colorCycle?: number
  shimmer?: number
  interval?: number
  search?: boolean
  maxHeight?: number
}

const CLEAR_LINE = '\x1b[2K'
const CURSOR_UP = (n: number) => `\x1b[${n}A`
const DIM = '\x1b[2m'

export class MultiSelect {
  private promptColor: string
  private promptGlyph: string
  private descriptionColor: string
  private errorColor: string
  private checkedPrefix: string
  private uncheckedPrefix: string
  private colorCycle: number
  private shimmer: number
  private interval: number
  private min: number
  private max: number | null
  private allowSkip: boolean
  private searchEnabled: boolean
  private maxHeight: number | undefined
  private _parsedColors: RgbColor[]
  private _colorOffset: number = 0
  private _shimmerPhase: number = 0

  constructor(options: MultiSelectOptions = {}) {
    this.promptColor = options.promptColor ?? resolveColor(config.color)
    this.promptGlyph = options.promptGlyph ?? (config.glyphs ? '◆' : '>')
    this.descriptionColor = options.descriptionColor ?? BLUE
    this.errorColor = options.errorColor ?? RED
    this.checkedPrefix = options.checkedPrefix ?? (config.glyphs ? '◉' : '[x]')
    this.uncheckedPrefix = options.uncheckedPrefix ?? (config.glyphs ? '○' : '[ ]')
    this.colorCycle = options.colorCycle ?? 1.0
    this.shimmer = options.shimmer ?? 0
    this.interval = options.interval ?? 80
    this.min = options.min ?? 0
    this.max = options.max ?? null
    this.allowSkip = options.allowSkip ?? false
    this.searchEnabled = options.search ?? false
    this.maxHeight = options.maxHeight
    const colors = options.colors ?? config.pulseColors
    this._parsedColors = colors.length >= 2 ? colors.map(parseHex) : []
  }

  private pulseColor(): string {
    if (this._parsedColors.length < 2) return ''
    const t = ((this._colorOffset % 1) + 1) % 1
    const base = interpolateColor(this._parsedColors, t)
    const color = applyShimmer(base, 0.5, this._shimmerPhase, this.shimmer)
    return formatColor(38, color)
  }

  async ask<T extends MultiSelectItem>(prompt: string, items: T[]): Promise<T[] | null> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('MultiSelect requires an interactive terminal')

    let cursor = 0
    let viewportOffset = 0
    let searchQuery = ''
    const checked = new Set<number>() // original indexes into items[]
    let error: string | null = null
    let lastDrawnLines = 0

    // Disable terminal auto-wrap while rendering: CURSOR_UP counts logical
    // (\n-terminated) lines, so a row that wraps to a 2nd physical row would
    // leave the cursor too low on redraw and the list would march down the
    // screen, ever-expanding. With wrap off, long rows are clipped at the
    // right margin and each logical line stays exactly one physical row.
    process.stdout.write(HIDE_CURSOR + DISABLE_WRAP)
    const glyph = this.promptGlyph ? `${colorText(this.promptColor, this.promptGlyph)} ` : ''
    const indent = ' '.repeat(this.promptGlyph ? stringLength(this.promptGlyph) + 1 : 0)
    process.stdout.write(`${glyph}${prompt}\n`)

    // each entry: the item + its original index in items[]
    const getFiltered = (): Array<{ item: T; originalIndex: number }> => {
      if (!this.searchEnabled || searchQuery === '') return items.map((item, i) => ({ item, originalIndex: i }))
      const q = searchQuery.toLowerCase()
      return items.map((item, i) => ({ item, originalIndex: i })).filter(({ item }) => item.label.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false))
    }

    // Largest item window we can draw without the terminal scrolling. The
    // redraw moves the cursor up by the number of lines drawn, so if the block
    // is taller than the viewport every frame scrolls the screen and the list
    // grows without bound. Cap to the terminal height (recomputed each render
    // so resizes are handled), reserving rows for the prompt, search line, the
    // always-present hint, and a possible error line.
    const computeMaxHeight = (): number => {
      const termRows = process.stdout.rows ?? 24
      const reserved = 1 /* prompt */ + (this.searchEnabled ? 1 : 0) + 1 /* hint */ + 1 /* error */
      const fit = Math.max(1, termRows - reserved - 1)
      return this.maxHeight ? Math.min(this.maxHeight, fit) : fit
    }

    const renderList = (redraw: boolean) => {
      const filtered = getFiltered()
      if (cursor >= filtered.length) cursor = Math.max(0, filtered.length - 1)

      // auto-scroll viewport (engages whenever the list outgrows the window,
      // whether the caller set maxHeight or the terminal is just too short)
      const maxHeight = computeMaxHeight()
      const useViewport = filtered.length > maxHeight
      if (useViewport) {
        if (cursor < viewportOffset) viewportOffset = cursor
        else if (cursor >= viewportOffset + maxHeight) viewportOffset = cursor - maxHeight + 1
        viewportOffset = Math.max(0, Math.min(viewportOffset, Math.max(0, filtered.length - maxHeight)))
      } else {
        viewportOffset = 0
      }

      const visibleStart = useViewport ? viewportOffset : 0
      const visibleEnd = useViewport ? Math.min(filtered.length, viewportOffset + maxHeight) : filtered.length

      if (redraw) {
        if (lastDrawnLines > 0) process.stdout.write(CURSOR_UP(lastDrawnLines))
        // \r snaps to col 0 before clearing — \x1b[0J alone starts from whatever
        // column the cursor landed on after the previous render's final \n
        process.stdout.write('\r\x1b[0J')
      }
      lastDrawnLines = 0

      if (this.searchEnabled) {
        process.stdout.write(`\r${indent}${colorText(this.promptColor, '/')} ${searchQuery}|\n`)
        lastDrawnLines++
      }

      const pulse = this.pulseColor()
      for (let vi = visibleStart; vi < visibleEnd; vi++) {
        const { item, originalIndex } = filtered[vi]
        const isCursor = vi === cursor
        const isChecked = checked.has(originalIndex)
        const numStr = `${vi + 1}.`
        const desc = item.description ? ` ${colorText(this.descriptionColor, `— ${item.description}`)}` : ''
        const checkMark = isChecked ? (pulse ? `${pulse}${this.checkedPrefix}${RESET}` : colorText(this.promptColor, this.checkedPrefix)) : this.uncheckedPrefix
        const label = isCursor ? (pulse ? `${pulse}${item.label}${RESET}` : colorText(this.promptColor, item.label)) : item.label
        process.stdout.write(`\r${indent}${numStr} ${checkMark} ${label}${desc}\n`)
        lastDrawnLines++
      }

      // Truncate hint to terminal width so it never wraps to an extra row —
      // a wrapped hint would make lastDrawnLines off by 1 and cause drift
      const hintContent = `↑↓ move  space/tab toggle  ←→ deselect/select${this.searchEnabled ? '  type to filter' : '  1-9 jump  a all'}  enter confirm`
      const maxHintCols = Math.max(10, (process.stdout.columns ?? 80) - stringLength(indent) - 1)
      const hint = stringLength(hintContent) > maxHintCols ? hintContent.slice(0, maxHintCols) : hintContent
      process.stdout.write(`\r${indent}${DIM}${hint}${RESET}\n`)
      lastDrawnLines++

      if (error) {
        process.stdout.write(`\r${indent}${colorText(this.errorColor, `✗ ${error}`)}\n`)
        lastDrawnLines++
      }
    }

    renderList(false)

    return new Promise((resolve) => {
      let timer: ReturnType<typeof setInterval> | null = null

      const deregisterCleanup = registerCleanup(() => {
        if (timer) {
          clearInterval(timer)
          timer = null
        }
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onKey)
        process.stdout.write(ENABLE_WRAP + SHOW_CURSOR)
      })

      const cleanup = (result: T[] | null) => {
        deregisterCleanup()
        if (timer) {
          clearInterval(timer)
          timer = null
        }

        if (lastDrawnLines > 0) process.stdout.write(CURSOR_UP(lastDrawnLines))
        process.stdout.write('\x1b[0J')
        // interactive block is gone — restore wrap so the final summary (which
        // is printed once, never redrawn) wraps long labels normally
        process.stdout.write(ENABLE_WRAP)

        const bulletWidth = stringLength(this.checkedPrefix) + 1
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          const bullet = checked.has(i) ? `${colorText(this.promptColor, this.checkedPrefix)} ` : ' '.repeat(bulletWidth)
          process.stdout.write(`\r${indent}${bullet}${item.label}\n`)
        }
        process.stdout.write(`\r${CLEAR_LINE}`)

        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onKey)
        process.stdout.write(ENABLE_WRAP + SHOW_CURSOR)
        resolve(result)
      }

      if (this._parsedColors.length >= 2) {
        timer = setInterval(() => {
          this._colorOffset = (this._colorOffset + (this.colorCycle * this.interval) / 1000) % 1
          if (this.shimmer > 0) this._shimmerPhase = (this._shimmerPhase + (SHIMMER_SPEED * this.interval) / 1000) % 1
          renderList(true)
        }, this.interval)
      }

      const onKey = (key: Buffer) => {
        const str = key.toString()
        const filtered = getFiltered()
        const safeLen = Math.max(1, filtered.length)

        if (str === '\x1b[A' || str === '\x1b[Z') {
          error = null
          cursor = (cursor - 1 + safeLen) % safeLen
          renderList(true)
        } else if (str === '\x1b[B') {
          error = null
          cursor = (cursor + 1) % safeLen
          renderList(true)
        } else if (str === ' ' || str === '\t') {
          const entry = filtered[cursor]
          if (!entry) return
          const oi = entry.originalIndex
          if (checked.has(oi)) {
            error = null
            checked.delete(oi)
          } else if (this.max === null || checked.size < this.max) {
            error = null
            checked.add(oi)
          } else {
            error = `Maximum ${this.max} item${this.max !== 1 ? 's' : ''} allowed`
          }
          renderList(true)
        } else if (str === '\x1b[C') {
          const entry = filtered[cursor]
          if (!entry) return
          const oi = entry.originalIndex
          if (!checked.has(oi)) {
            if (this.max === null || checked.size < this.max) {
              error = null
              checked.add(oi)
            } else {
              error = `Maximum ${this.max} item${this.max !== 1 ? 's' : ''} allowed`
            }
            renderList(true)
          }
        } else if (str === '\x1b[D') {
          const entry = filtered[cursor]
          if (!entry) return
          const oi = entry.originalIndex
          if (checked.has(oi)) {
            error = null
            checked.delete(oi)
            renderList(true)
          }
        } else if (str === 'a' && !this.searchEnabled) {
          if (checked.size === items.length) {
            checked.clear()
            error = null
          } else if (this.max !== null && items.length > this.max) {
            error = `Maximum ${this.max} item${this.max !== 1 ? 's' : ''} allowed`
          } else {
            for (let i = 0; i < items.length; i++) checked.add(i)
            error = null
          }
          renderList(true)
        } else if (str === '\r' || str === '\n') {
          const entry = filtered[cursor]
          if (checked.size === 0 && entry) checked.add(entry.originalIndex)
          if (checked.size < this.min) {
            error = `Select at least ${this.min} item${this.min !== 1 ? 's' : ''}`
            renderList(true)
            return
          }
          cleanup(items.filter((_, i) => checked.has(i)))
        } else if (str === '\x1b') {
          if (this.allowSkip) cleanup(null)
        } else if (str === '\x03') {
          deregisterCleanup()
          if (timer) {
            clearInterval(timer)
            timer = null
          }
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.removeListener('data', onKey)
          process.stdout.write(ENABLE_WRAP + SHOW_CURSOR)
          process.exit(130)
        } else if (this.searchEnabled) {
          if (str === '\x7f' || str === '\x08') {
            searchQuery = searchQuery.slice(0, -1)
            cursor = 0
            viewportOffset = 0
            error = null
            renderList(true)
          } else if (str.length === 1 && str >= ' ') {
            searchQuery += str
            cursor = 0
            viewportOffset = 0
            error = null
            renderList(true)
          }
        } else {
          const n = parseInt(str)
          if (!isNaN(n) && n >= 1 && n <= Math.min(filtered.length, 9)) {
            // Numbers are absolute, so digit n maps straight to item n (1-9);
            // renderList scrolls the viewport to bring it on-screen if needed.
            error = null
            cursor = n - 1
            renderList(true)
          }
        }
      }

      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.on('data', onKey)
    })
  }
}

export async function multiSelect<T extends MultiSelectItem>(prompt: string, items: T[], options?: MultiSelectOptions): Promise<T[] | null> {
  return new MultiSelect(options).ask(prompt, items)
}
