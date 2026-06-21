export type HelpColor = 'black' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan' | 'white' | number | `#${string}`

const locale = process.env.LC_ALL ?? process.env.LANG ?? ''
const isNonUtf8Locale = locale !== '' && !/utf-?8/i.test(locale)

const isLegacyTerminal = !!process.env.TERMKIT_ASCII || process.env.TERM === 'dumb' || isNonUtf8Locale || (process.platform === 'win32' && !process.env.WT_SESSION && process.env.TERM_PROGRAM !== 'vscode' && process.env.TERM_PROGRAM !== 'Hyper')

const isColorEnabled = !process.env.NO_COLOR && (!!process.env.FORCE_COLOR || !!process.stdout.isTTY)

export interface TermKitConfig {
  color: HelpColor
  pulseColors: string[]
  glyphs: boolean
  colors: boolean
  interactive: boolean
}

export const config: TermKitConfig = {
  color: 'cyan',
  pulseColors: ['#06b6d4', '#67e8f9'],
  glyphs: !isLegacyTerminal,
  colors: isColorEnabled,
  interactive: false
}

export function configure(opts: Partial<TermKitConfig>): void {
  if (opts.color) config.color = opts.color
  if (opts.pulseColors) config.pulseColors = opts.pulseColors
  if (opts.glyphs !== undefined) config.glyphs = opts.glyphs
  if (opts.colors !== undefined) config.colors = opts.colors
  if (opts.interactive !== undefined) config.interactive = opts.interactive
}
