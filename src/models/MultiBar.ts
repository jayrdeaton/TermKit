import { Bar, type BarOptions } from '@/models/Bar'
import { registerCleanup } from '@/utils/cleanup'
import { HIDE_CURSOR, SHOW_CURSOR } from '@/utils/color'

const CURSOR_UP = (n: number) => `\x1b[${n}A`

export interface MultiBarOptions {
  interval?: number
}

export class MultiBar {
  private _bars: Bar[] = []
  private _running = false
  private _interval: number
  private _linesWritten = 0
  private _cleanupDeregister: (() => void) | null = null

  constructor(options: MultiBarOptions = {}) {
    this._interval = options.interval ?? 35
  }

  // Add a bar to the group. Must be called before start().
  // Returns the Bar instance - use .update(), .progress, .tick(), .succeed(), etc.
  add(options: BarOptions = {}): Bar {
    const bar = new Bar(options)
    bar._isManaged = true
    this._bars.push(bar)
    return bar
  }

  start(): void {
    if (!process.stdout.isTTY) return
    this._running = true
    this._linesWritten = 0
    process.stdout.write(HIDE_CURSOR)
    this._cleanupDeregister = registerCleanup(() => {
      this._running = false
      if (this._linesWritten > 0) process.stdout.write(CURSOR_UP(this._linesWritten))
      process.stdout.write('\x1b[0J')
      process.stdout.write(SHOW_CURSOR)
    })
    this.render()
  }

  stop(): void {
    this._running = false
    this._cleanupDeregister?.()
    this._cleanupDeregister = null
    if (process.stdout.isTTY) process.stdout.write(SHOW_CURSOR)
  }

  private render(): void {
    // Render 1 char narrower than the terminal to prevent line-wrap on full-width
    // lines. A \n on an exactly-full-width line triggers deferred autowrap on many
    // terminals, adding a phantom blank row and throwing off the CURSOR_UP count.
    const width = Math.max(20, (process.stdout.columns ?? 80) - 1)

    if (this._linesWritten > 0) {
      process.stdout.write(CURSOR_UP(this._linesWritten))
    }

    for (const bar of this._bars) {
      if (bar._managedFinalLine !== null) {
        process.stdout.write(`\r${bar._managedFinalLine}\x1b[K\n`)
      } else {
        process.stdout.write(`\r${bar.renderLine(width)}\x1b[K\n`)
        bar.advanceFrame()
      }
    }
    this._linesWritten = this._bars.length

    if (!this._running) return

    if (this._bars.every((b) => b._managedFinalLine !== null)) {
      this._running = false
      this._cleanupDeregister?.()
      this._cleanupDeregister = null
      process.stdout.write(SHOW_CURSOR)
      return
    }

    setTimeout(() => {
      if (this._running) this.render()
    }, this._interval)
  }
}
