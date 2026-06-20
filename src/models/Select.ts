import { config } from '@/config'
import { registerCleanup } from '@/utils/cleanup'
import { applyShimmer, BLUE, colorText, DISABLE_WRAP, ENABLE_WRAP, formatColor, HIDE_CURSOR, interpolateColor, parseHex, RESET, resolveColor, type RgbColor, SHIMMER_SPEED, SHOW_CURSOR } from '@/utils/color'
import { stringLength } from '@/utils/stringLength'

export interface SelectItem {
  label: string
  description?: string
}

export interface SelectOptions {
  skipLabel?: string
  promptColor?: string
  promptGlyph?: string
  descriptionColor?: string
  selectedPrefix?: string
  selectedSuffix?: string
  colors?: string[]
  colorCycle?: number
  shimmer?: number
  interval?: number
  search?: boolean
  maxHeight?: number
}

const CURSOR_UP = (n: number) => `\x1b[${n}A`

export class Select {
  private promptColor: string
  private promptGlyph: string
  private descriptionColor: string
  private skipLabel: string
  private selectedPrefix: string
  private selectedSuffix: string
  private colorCycle: number
  private shimmer: number
  private interval: number
  private searchEnabled: boolean
  private maxHeight: number | undefined
  private _parsedColors: RgbColor[]
  private _colorOffset: number = 0
  private _shimmerPhase: number = 0

  constructor(options: SelectOptions = {}) {
    this.promptColor = options.promptColor ?? resolveColor(config.color)
    this.promptGlyph = options.promptGlyph ?? (config.glyphs ? '◆' : '>')
    this.descriptionColor = options.descriptionColor ?? BLUE
    this.skipLabel = options.skipLabel ?? 'Skip'
    this.selectedPrefix = options.selectedPrefix ?? '>'
    this.selectedSuffix = options.selectedSuffix ?? '<'
    this.colorCycle = options.colorCycle ?? 1.0
    this.shimmer = options.shimmer ?? 0
    this.interval = options.interval ?? 80
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

  async ask<T extends SelectItem>(prompt: string, items: T[]): Promise<T | null> {
    if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Select requires an interactive terminal')

    let selectedIndex = 0
    let viewportOffset = 0
    let visibleStart = 0
    let searchQuery = ''
    let lastDrawnLines = 0

    const skipItem = { label: this.skipLabel } as T

    // Largest list block we can draw without the terminal scrolling. The
    // redraw moves the cursor up by the number of lines drawn, so if the
    // block is taller than the viewport every frame scrolls the screen and
    // the list grows without bound. Cap the window to the terminal height
    // (recomputed each render so resizes are handled), reserving a row for
    // the prompt and the search line.
    const computeMaxHeight = (): number => {
      const termRows = process.stdout.rows ?? 24
      const reserved = 1 /* prompt */ + (this.searchEnabled ? 1 : 0)
      const fit = Math.max(1, termRows - reserved - 1)
      return this.maxHeight ? Math.min(this.maxHeight, fit) : fit
    }

    const getFiltered = (): T[] => {
      if (!this.searchEnabled || searchQuery === '') return items
      const q = searchQuery.toLowerCase()
      return items.filter((item) => item.label.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false))
    }

    // Disable terminal auto-wrap while rendering: CURSOR_UP counts logical
    // (\n-terminated) lines, so a row that wraps to a 2nd physical row would
    // leave the cursor too low on redraw and the list would march down the
    // screen, ever-expanding. With wrap off, long rows are clipped at the
    // right margin and each logical line stays exactly one physical row.
    process.stdout.write(HIDE_CURSOR + DISABLE_WRAP)
    const glyph = this.promptGlyph ? `${colorText(this.promptColor, this.promptGlyph)} ` : ''
    const indent = ' '.repeat(this.promptGlyph ? stringLength(this.promptGlyph) + 1 : 0)
    process.stdout.write(`${glyph}${prompt}\n`)

    const renderList = (redraw: boolean) => {
      const filtered = getFiltered()
      const allItems: T[] = [...filtered, skipItem]

      // clamp selectedIndex after filter changes
      if (selectedIndex >= allItems.length) selectedIndex = allItems.length - 1

      // auto-scroll viewport (engages whenever the list outgrows the window,
      // whether the caller set maxHeight or the terminal is just too short)
      const maxHeight = computeMaxHeight()
      const useViewport = allItems.length > maxHeight
      if (useViewport) {
        if (selectedIndex < viewportOffset) viewportOffset = selectedIndex
        else if (selectedIndex >= viewportOffset + maxHeight) viewportOffset = selectedIndex - maxHeight + 1
        viewportOffset = Math.max(0, Math.min(viewportOffset, Math.max(0, allItems.length - maxHeight)))
      } else {
        viewportOffset = 0
      }

      visibleStart = useViewport ? viewportOffset : 0
      const visibleEnd = useViewport ? Math.min(allItems.length, viewportOffset + maxHeight) : allItems.length

      if (redraw) {
        if (lastDrawnLines > 0) process.stdout.write(CURSOR_UP(lastDrawnLines))
        process.stdout.write('\r\x1b[0J')
      }
      lastDrawnLines = 0

      if (this.searchEnabled) {
        process.stdout.write(`\r${indent}${colorText(this.promptColor, '/')} ${searchQuery}|\n`)
        lastDrawnLines++
      }

      const pulse = this.pulseColor()
      for (let i = visibleStart; i < visibleEnd; i++) {
        const item = allItems[i]
        const isSelected = i === selectedIndex
        const isSkip = i === filtered.length
        const numStr = isSkip ? '0.' : `${i + 1}.`
        const desc = item.description ? ` ${colorText(this.descriptionColor, `— ${item.description}`)}` : ''
        let marker: string, tail: string
        if (isSelected && pulse) {
          marker = `${pulse}${this.selectedPrefix}${RESET}`
          tail = ` ${pulse}${this.selectedSuffix}${RESET}`
        } else {
          const fallback = isSelected ? this.promptColor : ''
          marker = fallback ? colorText(fallback, this.selectedPrefix) : ' '.repeat(stringLength(this.selectedPrefix))
          tail = isSelected ? ` ${colorText(this.promptColor, this.selectedSuffix)}` : ''
        }
        process.stdout.write(`\r${indent}${marker} ${numStr} ${item.label}${desc}${tail}\n`)
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

      const cleanup = (selectedLabel: string | null) => {
        deregisterCleanup()
        if (timer) {
          clearInterval(timer)
          timer = null
        }
        process.stdin.setRawMode(false)
        process.stdin.pause()
        process.stdin.removeListener('data', onKey)
        process.stdout.write(CURSOR_UP(lastDrawnLines + 1))
        process.stdout.write('\r\x1b[0J')
        process.stdout.write(ENABLE_WRAP)
        process.stdout.write(`${glyph}${prompt}: ${selectedLabel ?? this.skipLabel}\n`)
        process.stdout.write(SHOW_CURSOR)
      }

      if (this._parsedColors.length >= 2) {
        timer = setInterval(() => {
          this._colorOffset = (this._colorOffset + (this.colorCycle * this.interval) / 1000) % 1
          if (this.shimmer > 0) {
            this._shimmerPhase = (this._shimmerPhase + (SHIMMER_SPEED * this.interval) / 1000) % 1
          }
          renderList(true)
        }, this.interval)
      }

      const onKey = (key: Buffer) => {
        const str = key.toString()
        const filtered = getFiltered()
        const allItems: T[] = [...filtered, skipItem]

        if (str === '\x1b[A') {
          selectedIndex = (selectedIndex - 1 + allItems.length) % allItems.length
          renderList(true)
        } else if (str === '\x1b[B') {
          selectedIndex = (selectedIndex + 1) % allItems.length
          renderList(true)
        } else if (str === '\r' || str === '\n') {
          const result = selectedIndex === filtered.length ? null : (filtered[selectedIndex] ?? null)
          cleanup(result?.label ?? null)
          resolve(result)
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
            const newFiltered = getFiltered()
            if (selectedIndex >= newFiltered.length + 1) selectedIndex = Math.max(0, newFiltered.length)
            viewportOffset = 0
            renderList(true)
          } else if (str.length === 1 && str >= ' ') {
            searchQuery += str
            selectedIndex = 0
            viewportOffset = 0
            renderList(true)
          }
        } else {
          const n = parseInt(str)
          if (!isNaN(n) && n >= 0 && n <= Math.min(items.length, 9)) {
            // Numbers are absolute, so digit n maps straight to item n (1-9);
            // renderList scrolls the viewport to bring it on-screen if needed.
            selectedIndex = n === 0 ? allItems.length - 1 : n - 1
            selectedIndex = Math.max(0, Math.min(selectedIndex, allItems.length - 1))
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

export async function select<T extends SelectItem>(prompt: string, items: T[], options?: SelectOptions): Promise<T | null> {
  return new Select(options).ask(prompt, items)
}
