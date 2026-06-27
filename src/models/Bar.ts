import { config } from '@/config'
import { registerCleanup } from '@/utils/cleanup'
import { ansiColor, applyShimmer, BLUE, colorText, dimColor, FAINT, formatColor, GREEN, HIDE_CURSOR, interpolateColor, parseHex, RED, RESET, type RgbColor, SHIMMER_SPEED, SHOW_CURSOR, YELLOW } from '@/utils/color'
import { stringLength } from '@/utils/stringLength'

export type BarMode = 'bounce' | 'loop' | 'loop-reverse'

export interface BarOptions {
  length?: number
  prefix?: string
  suffix?: string
  character?: string
  before?: string
  after?: string
  text?: string
  reverse?: boolean
  interval?: number
  mode?: BarMode
  progress?: number
  colors?: string[]
  bgColors?: string[]
  colorFill?: boolean
  colorCycle?: number
  shimmer?: number
  onBounce?: () => void
  onLoop?: () => void
  onComplete?: () => void
  successColor?: string
  failColor?: string
  warnColor?: string
  infoColor?: string
  glyphs?: boolean
  showRate?: boolean
  showEta?: boolean
  rateUnit?: string
}

export class Bar {
  static current: Bar | null = null
  static readonly COLORS = {
    blueRed: ['#0000ff', '#ff0000'],
    redBlue: ['#ff0000', '#0000ff'],
    rainbow: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#8b00ff'],
    heat: ['#0000ff', '#00ffff', '#ffff00', '#ff0000'],
    cool: ['#00ffff', '#0000ff', '#8b00ff'],
    sunset: ['#8b00ff', '#ff0000', '#ff7f00']
  }

  length: number
  character: string
  interval: number
  mode: BarMode
  progress: number | undefined
  colorFill: boolean
  colorCycle: number
  shimmer: number
  text: string
  reverse: boolean
  onBounce: (() => void) | undefined
  onLoop: (() => void) | undefined
  onComplete: (() => void) | undefined

  // used by MultiBar — not intended for direct external use
  _isManaged = false
  _managedFinalLine: string | null = null

  private running: boolean
  private forwardMotion: boolean
  private position: number
  private prefixString: string
  private suffixString: string
  private beforeEmpty: string
  private afterEmpty: string
  private _colors: string[] = []
  private _parsedColors: RgbColor[] = []
  private _dimmedColors: RgbColor[] = []
  private _bgColors: string[] = []
  private _parsedBgColors: RgbColor[] = []
  private _colorOffset: number = 0
  private _shimmerPhase: number = 0
  private _completed: boolean = false
  private _autoLength: boolean
  private _resizeListener: (() => void) | null = null
  private _cleanupDeregister: (() => void) | null = null
  private _successColor: string
  private _failColor: string
  private _warnColor: string
  private _infoColor: string
  private _glyphs: boolean
  private _total: number | null = null
  private _tickCount: number = 0
  private _startTime: number | null = null
  private _showRate: boolean
  private _showEta: boolean
  private _rateUnit: string
  private _etaSuffix: string = ''

  constructor(text?: string | BarOptions, options?: BarOptions) {
    const opts: BarOptions = typeof text === 'string' ? { ...options, text } : (text ?? {})
    this.running = false
    this.forwardMotion = true
    this._autoLength = opts.length === undefined
    this.length = opts.length ?? process.stdout.columns ?? 80
    this.prefixString = opts.prefix ?? '['
    this.suffixString = opts.suffix ?? ']'
    this.character = opts.character ?? '──'
    this.beforeEmpty = opts.before ?? ' '
    this.afterEmpty = opts.after ?? ' '
    this.position = 1
    this.interval = opts.interval ?? 35
    this.mode = opts.mode ?? 'bounce'
    this.progress = opts.progress
    this.colorFill = opts.colorFill ?? false
    this.colorCycle = opts.colorCycle ?? 0.5
    this.shimmer = opts.shimmer ?? 0
    this.text = opts.text ?? ''
    this.reverse = opts.reverse ?? false
    this.onBounce = opts.onBounce
    this.onLoop = opts.onLoop
    this.onComplete = opts.onComplete
    this.colors = opts.colors ?? ['#c026d3', '#e879f9']
    this.bgColors = opts.bgColors ?? []
    this._successColor = opts.successColor ?? GREEN
    this._failColor = opts.failColor ?? RED
    this._warnColor = opts.warnColor ?? YELLOW
    this._infoColor = opts.infoColor ?? BLUE
    this._glyphs = opts.glyphs ?? config.glyphs
    this._showRate = opts.showRate ?? false
    this._showEta = opts.showEta ?? false
    this._rateUnit = opts.rateUnit ?? ''
  }

  get colors(): string[] {
    return this._colors
  }

  set colors(value: string[]) {
    this._colors = value
    this._parsedColors = value.length > 1 ? value.map(parseHex) : []
    this._dimmedColors = this._parsedColors.map(dimColor)
  }

  get bgColors(): string[] {
    return this._bgColors
  }

  set bgColors(value: string[]) {
    this._bgColors = value
    this._parsedBgColors = value.length > 1 ? value.map(parseHex) : []
  }

  set prefix(string: string) {
    if (stringLength(string) > stringLength(this.prefixString)) {
      this.position -= stringLength(string) - 1
      if (this.position < 1) this.position = 1
    } else {
      this.position += stringLength(this.prefixString) - 1
    }
    this.prefixString = string
  }

  set suffix(string: string) {
    const length = this.length - stringLength(this.prefixString) - stringLength(this.character) - stringLength(string)
    if (this.position > length) {
      this.position = length
      if (this.forwardMotion) this.forwardMotion = false
    }
    this.suffixString = string
  }

  set before(string: string) {
    this.beforeEmpty = stringLength(string) > 1 ? string.charAt(0) : string
  }

  set after(string: string) {
    this.afterEmpty = stringLength(string) > 1 ? string.charAt(0) : string
  }

  set empty(string: string) {
    const char = stringLength(string) > 1 ? string.charAt(0) : string
    this.beforeEmpty = char
    this.afterEmpty = char
  }

  start(): void {
    if (this._isManaged) return
    if (!process.stdout.isTTY) return
    this.running = true
    Bar.current = this
    process.stdout.write(HIDE_CURSOR)
    this._cleanupDeregister = registerCleanup(() => {
      this.running = false
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      process.stdout.clearLine?.(0)
      process.stdout.write(SHOW_CURSOR)
    })
    if (this._autoLength) {
      this._resizeListener = () => {
        this.length = process.stdout.columns ?? 80
        process.stdout.write('\x1b[0J')
      }
      process.stdout.on('resize', this._resizeListener)
    }
    this.run()
  }

  stop(message?: string): this {
    this.running = false
    if (this._isManaged) {
      this._managedFinalLine = message ?? ''
      return this
    }
    if (Bar.current === this) Bar.current = null
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) {
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      this.clear()
      process.stdout.write(SHOW_CURSOR)
    }
    if (message) process.stdout.write(`${message}\n`)
    return this
  }

  update(string: string): this {
    this.text = string
    return this
  }

  log(message: string, glyph: string = `${FAINT}·${RESET}`): this {
    if (process.stdout.isTTY) {
      this.clear()
    }
    process.stdout.write(`${glyph ? `${glyph} ` : ''}${message}\n`)
    return this
  }

  track(total: number, options?: { unit?: string; showRate?: boolean; showEta?: boolean }): this {
    this._total = total
    this._tickCount = 0
    this._startTime = Date.now()
    this._etaSuffix = ''
    if (options?.unit !== undefined) this._rateUnit = options.unit
    if (options?.showRate !== undefined) this._showRate = options.showRate
    if (options?.showEta !== undefined) this._showEta = options.showEta
    if (!this._showRate && !this._showEta) {
      this._showRate = true
      this._showEta = true
    }
    return this
  }

  tick(n = 1): this {
    this._tickCount += n
    if (this._total !== null && this._startTime !== null) {
      this.progress = Math.min(1, this._tickCount / this._total)
      const elapsed = (Date.now() - this._startTime) / 1000
      const rate = elapsed > 0 ? this._tickCount / elapsed : 0
      const remaining = this._total - this._tickCount

      const parts: string[] = []
      if (this._showRate) {
        const rateStr = rate >= 1000 ? `${(rate / 1000).toFixed(1)}k` : rate >= 1 ? rate.toFixed(1) : rate.toFixed(2)
        parts.push(`${rateStr}/s${this._rateUnit ? ` ${this._rateUnit}` : ''}`)
      }
      if (this._showEta && remaining > 0) {
        const eta = rate > 0 ? remaining / rate : 0
        const etaStr = eta >= 3600 ? `${Math.floor(eta / 3600)}h${Math.floor((eta % 3600) / 60)}m` : eta >= 60 ? `${Math.floor(eta / 60)}m${Math.floor(eta % 60)}s` : `${Math.ceil(eta)}s`
        parts.push(`ETA ${etaStr}`)
      }
      this._etaSuffix = parts.join(' · ')
    }
    return this
  }

  get rate(): number {
    if (this._startTime === null || this._tickCount === 0) return 0
    const elapsed = (Date.now() - this._startTime) / 1000
    return elapsed > 0 ? this._tickCount / elapsed : 0
  }

  get eta(): number {
    if (this._total === null || this.rate === 0) return 0
    return Math.max(0, (this._total - this._tickCount) / this.rate)
  }

  succeed(string?: string): this {
    this.running = false
    if (Bar.current === this) Bar.current = null
    const g = this._glyphs ? '✔' : '+'
    if (this._isManaged) {
      this._managedFinalLine = `${colorText(this._successColor, g)}${string ? ` ${string}` : ''}`
      return this
    }
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) {
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      this.clear()
      process.stdout.write(`${SHOW_CURSOR}${colorText(this._successColor, g)}${string ? ` ${string}` : ''}\n`)
    } else {
      process.stdout.write(`${g}${string ? ` ${string}` : ''}\n`)
    }
    return this
  }

  fail(string?: string): this {
    this.running = false
    if (Bar.current === this) Bar.current = null
    const g = this._glyphs ? '✖' : 'X'
    if (this._isManaged) {
      this._managedFinalLine = `${colorText(this._failColor, g)}${string ? ` ${string}` : ''}`
      return this
    }
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) {
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      this.clear()
      process.stdout.write(`${SHOW_CURSOR}${colorText(this._failColor, g)}${string ? ` ${string}` : ''}\n`)
    } else {
      process.stdout.write(`${g}${string ? ` ${string}` : ''}\n`)
    }
    return this
  }

  warn(string?: string): this {
    this.running = false
    if (Bar.current === this) Bar.current = null
    const g = this._glyphs ? '⚠' : '!'
    if (this._isManaged) {
      this._managedFinalLine = `${colorText(this._warnColor, g)}${string ? ` ${string}` : ''}`
      return this
    }
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) {
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      this.clear()
      process.stdout.write(`${SHOW_CURSOR}${colorText(this._warnColor, g)}${string ? ` ${string}` : ''}\n`)
    } else {
      process.stdout.write(`${g}${string ? ` ${string}` : ''}\n`)
    }
    return this
  }

  info(string?: string): this {
    this.running = false
    if (Bar.current === this) Bar.current = null
    const g = this._glyphs ? 'ℹ' : 'i'
    if (this._isManaged) {
      this._managedFinalLine = `${colorText(this._infoColor, g)}${string ? ` ${string}` : ''}`
      return this
    }
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) {
      if (this._resizeListener) {
        process.stdout.off('resize', this._resizeListener)
        this._resizeListener = null
      }
      this.clear()
      process.stdout.write(`${SHOW_CURSOR}${colorText(this._infoColor, g)}${string ? ` ${string}` : ''}\n`)
    } else {
      process.stdout.write(`${g}${string ? ` ${string}` : ''}\n`)
    }
    return this
  }

  // Returns the rendered bar line string for the current animation frame.
  // width overrides this.length for use by MultiBar.
  renderLine(width?: number): string {
    return this.buildLine(width)
  }

  // Advances animation state (color cycle, shimmer, indeterminate position).
  // Called by MultiBar after reading renderLine() each tick.
  advanceFrame(): void {
    const totalLength = this.length
    const textReserved = this.text ? stringLength(this.text) + 1 : 0
    const suffixReserved = this._etaSuffix ? stringLength(this._etaSuffix) + 1 : 0
    const length = Math.max(1, totalLength - textReserved - suffixReserved - stringLength(this.prefixString) - stringLength(this.character) - stringLength(this.suffixString))
    if (this.progress === undefined) this.advanceIndeterminate(length)
    if (this.colorCycle > 0) this._colorOffset = (this._colorOffset + (this.colorCycle * this.interval) / 1000) % 1
    if (this.shimmer > 0) this._shimmerPhase = (this._shimmerPhase + (SHIMMER_SPEED * this.interval) / 1000) % 1
  }

  private clear(): void {
    process.stdout.clearLine?.(0)
  }

  private effectiveT(t: number): number {
    if (this.colorCycle === 0) return t
    return (((t + this._colorOffset) % 1) + 1) % 1
  }

  private coloredChar(colors: RgbColor[], code: 38 | 48, t: number): string {
    const et = this.effectiveT(t)
    const base = interpolateColor(colors, et)
    const shimmered = applyShimmer(base, t, this._shimmerPhase, this.shimmer)
    return formatColor(code, shimmered)
  }

  private colorChar(t: number): string {
    const fg = this._parsedColors.length >= 2 ? this.coloredChar(this._parsedColors, 38, t) : ''
    const bg = this._parsedBgColors.length >= 2 ? this.coloredChar(this._parsedBgColors, 48, t) : ''
    return fg || bg ? fg + bg + this.character + RESET : this.character
  }

  private colorFillChar(char: string, t: number): string {
    const fg = this.colorFill && this._dimmedColors.length >= 2 ? this.coloredChar(this._dimmedColors, 38, t) : ''
    const bg = this._parsedBgColors.length >= 2 ? this.coloredChar(this._parsedBgColors, 48, t) : ''
    return fg || bg ? fg + bg + char + RESET : char
  }

  private buildDeterminate(length: number): string {
    const charWidth = stringLength(this.character)
    const clamped = Math.max(0, Math.min(1, this.progress!))
    const filled = Math.round(clamped * length)
    let working = this.prefixString
    for (let i = 0; i < filled; i++) {
      const t = length > 1 ? i / (length - 1) : 0
      working += this.colorChar(t)
    }
    for (let i = filled; i < length; i++) {
      const t = length > 1 ? i / (length - 1) : 0
      // pad each empty position to charWidth so the bar stays constant width
      for (let j = 0; j < charWidth; j++) {
        working += this.colorFillChar(this.afterEmpty, t)
      }
    }
    working += this.suffixString
    if (clamped >= 1 && !this._completed) {
      this._completed = true
      this.onComplete?.()
    } else if (clamped < 1) {
      this._completed = false
    }
    return working
  }

  private buildIndeterminate(length: number): string {
    const pos = Math.max(1, Math.min(length, this.position))
    let working = this.prefixString
    let i = 1
    while (i < pos) {
      const t = length > 1 ? (i - 1) / (length - 1) : 0
      working += this.colorFillChar(this.beforeEmpty, t)
      i++
    }
    const charT = length > 1 ? (pos - 1) / (length - 1) : 0
    working += this.colorChar(charT)
    i++
    while (i <= length) {
      const t = length > 1 ? (i - 1) / (length - 1) : 0
      working += this.colorFillChar(this.afterEmpty, t)
      i++
    }
    working += this.suffixString
    return working
  }

  private advanceIndeterminate(length: number): void {
    if (this.position > length) {
      this.position = length
      this.forwardMotion = false
    }
    if (this.position < 1) {
      this.position = 1
      this.forwardMotion = true
    }
    if (this.mode === 'loop') {
      this.position++
      if (this.position > length) {
        this.position = 1
        this.onLoop?.()
      }
    } else if (this.mode === 'loop-reverse') {
      this.position--
      if (this.position < 1) {
        this.position = length
        this.onLoop?.()
      }
    } else {
      if (this.forwardMotion) {
        this.position++
        if (this.position >= length) {
          this.forwardMotion = false
          this.onBounce?.()
        }
      } else {
        this.position--
        if (this.position <= 1) {
          this.forwardMotion = true
          this.onBounce?.()
        }
      }
    }
  }

  private buildLine(width?: number): string {
    const totalLength = width ?? this.length
    const charWidth = stringLength(this.character)
    const textReserved = this.text ? stringLength(this.text) + 1 : 0
    const suffixReserved = this._etaSuffix ? stringLength(this._etaSuffix) + 1 : 0
    const available = totalLength - textReserved - suffixReserved - stringLength(this.prefixString) - stringLength(this.suffixString)
    const length =
      this.progress !== undefined
        ? // Determinate: every position (filled or empty) is charWidth wide → constant bar width
          Math.max(1, Math.floor((available - 1) / charWidth))
        : // Indeterminate: one position uses character, rest use 1-char fill (unchanged formula)
          Math.max(1, available - charWidth)
    const working = this.progress !== undefined ? this.buildDeterminate(length) : this.buildIndeterminate(length)
    const t = this.text
    const suffix = this._etaSuffix ? ` ${this._etaSuffix}` : ''
    return this.reverse ? (t ? `${t} ${working}` : working) : t ? `${working} ${t}${suffix}` : `${working}${suffix}`
  }

  private run(): void {
    process.stdout.write(`\r${this.buildLine()}\x1b[K`)
    this.advanceFrame()
    setTimeout(() => {
      if (this.running) this.run()
    }, this.interval)
  }
}

// keep ansiColor importable so nothing downstream breaks
export { ansiColor }
