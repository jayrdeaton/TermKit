import { config } from '@/config'
import { markup, type MarkupOptions } from '@/models/Markup'
import { BLUE, colorText, GREEN, RED, YELLOW } from '@/utils/color'

export interface LogOptions {
  successColor?: string
  failColor?: string
  warnColor?: string
  infoColor?: string
  glyphs?: boolean
}

export class Log {
  private _successColor: string
  private _failColor: string
  private _warnColor: string
  private _infoColor: string
  private _glyphs: boolean

  constructor(options: LogOptions = {}) {
    this._successColor = options.successColor ?? GREEN
    this._failColor = options.failColor ?? RED
    this._warnColor = options.warnColor ?? YELLOW
    this._infoColor = options.infoColor ?? BLUE
    this._glyphs = options.glyphs ?? config.glyphs
  }

  private write(unicode: string, ascii: string, color: string, message?: string): void {
    const glyph = this._glyphs ? unicode : ascii
    if (process.stdout.isTTY) {
      process.stdout.write(`${colorText(color, glyph)}${message ? ` ${message}` : ''}\n`)
    } else {
      process.stdout.write(`${glyph}${message ? ` ${message}` : ''}\n`)
    }
  }

  succeed(message?: string): void {
    this.write('✔', '+', this._successColor, message)
  }

  fail(message?: string): void {
    this.write('✖', 'X', this._failColor, message)
  }

  warn(message?: string): void {
    this.write('⚠', '!', this._warnColor, message)
  }

  info(message?: string): void {
    this.write('ℹ', 'i', this._infoColor, message)
  }

  data(value?: unknown, options?: MarkupOptions): void {
    process.stdout.write(`${markup(value, options)}\n`)
  }
}

export const log = new Log()
