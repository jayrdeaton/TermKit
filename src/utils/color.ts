import { config } from '@/config'

export const RESET = '\x1b[0m'
export const SHOW_CURSOR = '\x1b[?25h'
export const HIDE_CURSOR = '\x1b[?25l'
export const DISABLE_WRAP = '\x1b[?7l'
export const ENABLE_WRAP = '\x1b[?7h'
export const BOLD = '\x1b[1m'
export const FAINT = '\x1b[2m'
export const GREEN = '\x1b[32m'
export const RED = '\x1b[31m'
export const YELLOW = '\x1b[33m'
export const BLUE = '\x1b[34m'
export const MAGENTA = '\x1b[35m'
export const CYAN = '\x1b[36m'
export const DIM = 0.35
export const SHIMMER_SPEED = 0.5 // cycles per second

// Restore cursor if process exits while a bar/spinner is running
process.on('exit', () => {
  if (process.stdout.isTTY) process.stdout.write(SHOW_CURSOR)
})
process.on('SIGINT', () => process.exit())

export interface RgbColor {
  r: number
  g: number
  b: number
}

export function parseHex(hex: string): RgbColor {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff }
}

export function lerpColor(a: RgbColor, b: RgbColor, t: number): RgbColor {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  }
}

export function interpolateColor(colors: RgbColor[], t: number): RgbColor {
  const clamped = Math.max(0, Math.min(1, t))
  const segments = colors.length - 1
  const scaled = clamped * segments
  const i = Math.min(Math.floor(scaled), segments - 1)
  return lerpColor(colors[i], colors[i + 1], scaled - i)
}

export function formatColor(code: 38 | 48, color: RgbColor): string {
  if (!config.colors) return ''
  return `\x1b[${code};2;${color.r};${color.g};${color.b}m`
}

export function colorText(colorOrAnsi: string, text: string): string {
  if (!config.colors) return text
  if (colorOrAnsi.startsWith('#')) {
    const c = parseHex(colorOrAnsi)
    return `\x1b[38;2;${c.r};${c.g};${c.b}m${text}${RESET}`
  }
  return `${colorOrAnsi}${text}${RESET}`
}

export function ansiColor(code: 38 | 48, colors: RgbColor[], t: number): string {
  return formatColor(code, interpolateColor(colors, t))
}

export function dimColor(c: RgbColor): RgbColor {
  return { r: Math.round(c.r * DIM), g: Math.round(c.g * DIM), b: Math.round(c.b * DIM) }
}

export function shimmerFactor(t: number, phase: number, amplitude: number): number {
  const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t - phase))
  return 1 - amplitude * (1 - wave)
}

export function resolveColor(color: string | number): string {
  if (typeof color === 'number') return `\x1b[38;5;${color}m`
  if (color.startsWith('#')) return color
  const map: Record<string, string> = {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
  }
  return map[color] ?? '\x1b[35m'
}

export function applyShimmer(color: RgbColor, t: number, phase: number, amplitude: number): RgbColor {
  if (amplitude === 0) return color
  const factor = shimmerFactor(t, phase, amplitude)
  return {
    r: Math.round(color.r * factor),
    g: Math.round(color.g * factor),
    b: Math.round(color.b * factor)
  }
}
