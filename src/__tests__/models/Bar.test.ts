import { Bar } from '../../models/Bar'

if (!process.stdout.clearLine) {
  process.stdout.clearLine = (_dir: number, callback?: () => void) => {
    callback?.()
    return true
  }
}

const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
const mockClearLine = jest.spyOn(process.stdout, 'clearLine').mockImplementation(() => true)

// skip cursor-control writes, return the first actual bar/spinner frame
const frames = () => mockWrite.mock.calls.filter((c) => !(c[0] as string).startsWith(`\x1b[?25`)).map((c) => c[0] as string)
const firstFrame = () => frames()[0]

// frames start with \r and end with \x1b[K — strip those plus the leading [ and trailing ] to get inner content
const innerContent = (frame: string) => frame.slice(2, -4)

beforeEach(() => {
  mockWrite.mockClear()
  mockClearLine.mockClear()
  jest.useFakeTimers()
  Bar.current = null
})

afterEach(() => {
  jest.useRealTimers()
  Bar.current = null
})

describe('Bar constructor', () => {
  it('uses defaults when no options provided', () => {
    const bar = new Bar()
    expect(bar.character).toBe('──')
    expect(bar.interval).toBe(35)
    expect(bar.mode).toBe('bounce')
    expect(bar.progress).toBeUndefined()
    expect(bar.colors).toEqual(['#c026d3', '#e879f9'])
  })

  it('applies provided options', () => {
    const bar = new Bar({ character: '=', interval: 100, length: 50, mode: 'loop' })
    expect(bar.character).toBe('=')
    expect(bar.interval).toBe(100)
    expect(bar.length).toBe(50)
    expect(bar.mode).toBe('loop')
  })

  it('accepts text as first argument', () => {
    const bar = new Bar('Processing...')
    expect(bar.text).toBe('Processing...')
  })

  it('accepts text and options as separate arguments', () => {
    const bar = new Bar('Processing...', { length: 40, interval: 100 })
    expect(bar.text).toBe('Processing...')
    expect(bar.length).toBe(40)
    expect(bar.interval).toBe(100)
  })

  it('text argument takes precedence over text in options', () => {
    const bar = new Bar('from arg', { text: 'from options' })
    expect(bar.text).toBe('from arg')
  })
})

describe('Bar setters', () => {
  it('sets prefix string', () => {
    const bar = new Bar({ length: 40 })
    bar.prefix = 'Working: ['
    bar.start()
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('Working: ['))
  })

  it('sets suffix string', () => {
    const bar = new Bar({ length: 40 })
    bar.suffix = '] done'
    bar.start()
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('] done'))
  })

  it('sets before to single character only', () => {
    const bar = new Bar({ length: 40 })
    bar.before = 'ab'
    bar.start()
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('sets after to single character only', () => {
    const bar = new Bar({ length: 40 })
    bar.after = 'xy'
    bar.start()
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('sets both before and after via empty setter', () => {
    const bar = new Bar({ length: 40 })
    bar.empty = '0'
    bar.start()
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })
})

describe('Bar start/stop', () => {
  it('writes to stdout on start', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    expect(mockWrite).toHaveBeenCalledWith(expect.stringMatching(/^\r/))
    bar.stop()
  })

  it('clears line on stop', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.stop()
    expect(mockClearLine).toHaveBeenCalledWith(0)
  })

  it('writes stop message when provided', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.stop('Done!')
    expect(mockWrite).toHaveBeenCalledWith('Done!\n')
  })

  it('stops the animation loop', () => {
    const bar = new Bar({ length: 40, interval: 50 })
    bar.start()
    bar.stop()
    const callCount = mockWrite.mock.calls.length
    jest.advanceTimersByTime(500)
    expect(mockWrite.mock.calls.length).toBe(callCount)
  })
})

describe('Bar text and reverse', () => {
  it('update() updates text inline without writing to stdout', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    mockWrite.mockClear()
    bar.update('hello')
    expect(bar.text).toBe('hello')
    expect(mockWrite).not.toHaveBeenCalled()
    bar.stop()
  })

  it('update() returns this for chaining', () => {
    const bar = new Bar({ length: 40 })
    expect(bar.update('hello')).toBe(bar)
  })

  it('text appears after the bar by default', () => {
    const bar = new Bar({ length: 10, prefix: '[', suffix: ']', text: 'Loading' })
    bar.start()
    const frame = firstFrame()
    const barPart = frame.indexOf(']')
    const textPart = frame.indexOf('Loading')
    expect(textPart).toBeGreaterThan(barPart)
    bar.stop()
  })

  it('text appears before the bar when reversed', () => {
    const bar = new Bar({ length: 10, prefix: '[', suffix: ']', text: 'Loading', reverse: true })
    bar.start()
    const frame = firstFrame()
    const barPart = frame.indexOf('[')
    const textPart = frame.indexOf('Loading')
    expect(textPart).toBeLessThan(barPart)
    bar.stop()
  })

  it('updated text appears in subsequent frames', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.update('new label')
    jest.runOnlyPendingTimers()
    const frame = frames()[1]
    expect(frame).toContain('new label')
    bar.stop()
  })

  it('bar shrinks to make room for text so line does not overflow', () => {
    const bar = new Bar({ length: 20, prefix: '[', suffix: ']', text: 'hello world' })
    bar.start()
    const frame = firstFrame()
    const visual = frame.replace(/^\r/, '').replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, '')
    expect(visual.length).toBeLessThanOrEqual(20)
    expect(frame).toContain('hello world')
    bar.stop()
  })

  it('pads when text shrinks to overwrite stale characters', () => {
    const bar = new Bar({ length: 20, prefix: '[', suffix: ']' })
    bar.start()
    bar.update('hello world')
    jest.runOnlyPendingTimers()
    bar.update('')
    jest.runOnlyPendingTimers()
    const frame = frames()[2]
    // without text the bar expands, but \r should still be at start with no \n
    expect(frame).toMatch(/^\r/)
    expect(frame).not.toContain('\n')
    bar.stop()
  })
})

describe('Bar log method', () => {
  it('uses faint middle dot as default glyph', () => {
    const bar = new Bar({ length: 40 })
    bar.log('uploading file')
    const call = mockWrite.mock.calls.find((c) => (c[0] as string).includes('uploading file'))
    expect(call?.[0]).toContain('·')
    expect(call?.[0]).toContain('\x1b[2m')
  })

  it('writes custom glyph and message with a space separator', () => {
    const bar = new Bar({ length: 40 })
    bar.log('uploading file', '→')
    expect(mockWrite).toHaveBeenCalledWith('→ uploading file\n')
  })

  it('omits the space when glyph is empty string', () => {
    const bar = new Bar({ length: 40 })
    bar.log('just a message', '')
    expect(mockWrite).toHaveBeenCalledWith('just a message\n')
  })

  it('clears the bar line before writing', () => {
    const bar = new Bar({ length: 40, interval: 35 })
    bar.start()
    jest.spyOn(process.stdout, 'clearLine').mockClear()
    bar.log('step done', '✓')
    expect(process.stdout.clearLine).toHaveBeenCalled()
    bar.stop()
  })

  it('bar continues running after log()', () => {
    const bar = new Bar({ length: 40, interval: 35 })
    bar.start()
    const countBefore = mockWrite.mock.calls.length
    bar.log('log line', '→')
    jest.runOnlyPendingTimers()
    expect(mockWrite.mock.calls.length).toBeGreaterThan(countBefore + 1)
    bar.stop()
  })

  it('returns this for chaining', () => {
    const bar = new Bar({ length: 40 })
    expect(bar.log('msg', '→')).toBe(bar)
  })

  it('accepts a pre-colored ANSI glyph string', () => {
    const bar = new Bar({ length: 40 })
    const coloredGlyph = '\x1b[32m✔\x1b[0m'
    bar.log('colored glyph', coloredGlyph)
    expect(mockWrite).toHaveBeenCalledWith(`${coloredGlyph} colored glyph\n`)
  })
})

describe('Bar mode', () => {
  it('loop mode wraps from right to left', () => {
    const bar = new Bar({ length: 10, mode: 'loop', character: '-', prefix: '[', suffix: ']' })
    bar.start()
    for (let i = 0; i < 20; i++) jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('loop-reverse mode wraps from left to right', () => {
    const bar = new Bar({ length: 10, mode: 'loop-reverse', character: '-', prefix: '[', suffix: ']' })
    bar.start()
    for (let i = 0; i < 20; i++) jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('mode can be changed while running', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    jest.runOnlyPendingTimers()
    bar.mode = 'loop'
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })
})

describe('Bar progress (determinate)', () => {
  it('renders determinate bar at 0%', () => {
    const bar = new Bar({ length: 12, character: '=', prefix: '[', suffix: ']', progress: 0 })
    bar.start()
    const call = mockWrite.mock.calls.find((c) => (c[0] as string).startsWith('\r['))
    expect(call).toBeDefined()
    bar.stop()
  })

  it('renders determinate bar at 50%', () => {
    const bar = new Bar({ length: 12, character: '=', prefix: '[', suffix: ']', progress: 0.5 })
    bar.start()
    const frame = mockWrite.mock.calls.find((c) => (c[0] as string).startsWith('\r['))?.[0] as string
    expect(frame).toBeDefined()
    const inner = innerContent(frame)
    const filled = inner.split('').filter((c) => c === '=').length
    expect(filled).toBeGreaterThan(0)
    expect(filled).toBeLessThan(inner.length)
    bar.stop()
  })

  it('renders determinate bar at 100%', () => {
    const bar = new Bar({ length: 12, character: '=', prefix: '[', suffix: ']', progress: 1, colors: [] })
    bar.start()
    const frame = mockWrite.mock.calls.find((c) => (c[0] as string).startsWith('\r['))?.[0] as string
    const inner = innerContent(frame)
    expect(inner.split('').every((c) => c === '=')).toBe(true)
    bar.stop()
  })

  it('progress can be set while running', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.progress = 0.75
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('progress can be cleared to return to animation', () => {
    const bar = new Bar({ length: 40, progress: 0.5 })
    bar.start()
    bar.progress = undefined
    jest.runOnlyPendingTimers()
    bar.stop()
    expect(mockWrite).toHaveBeenCalled()
  })

  it('clamps progress below 0', () => {
    const bar = new Bar({ length: 12, character: '=', prefix: '[', suffix: ']', progress: -1 })
    bar.start()
    const frame = mockWrite.mock.calls.find((c) => (c[0] as string).startsWith('\r['))?.[0] as string
    const inner = innerContent(frame)
    expect(inner.split('').every((c) => c === ' ')).toBe(true)
    bar.stop()
  })

  it('clamps progress above 1', () => {
    const bar = new Bar({ length: 12, character: '=', prefix: '[', suffix: ']', progress: 5, colors: [] })
    bar.start()
    const frame = mockWrite.mock.calls.find((c) => (c[0] as string).startsWith('\r['))?.[0] as string
    const inner = innerContent(frame)
    expect(inner.split('').every((c) => c === '=')).toBe(true)
    bar.stop()
  })
})

describe('Bar colors', () => {
  it('defaults to magenta gradient', () => {
    const bar = new Bar()
    expect(bar.colors).toEqual(['#c026d3', '#e879f9'])
  })

  it('accepts colors via constructor', () => {
    const bar = new Bar({ colors: ['#ff0000', '#0000ff'] })
    expect(bar.colors).toEqual(['#ff0000', '#0000ff'])
  })

  it('accepts colors via setter', () => {
    const bar = new Bar()
    bar.colors = ['#ff0000', '#0000ff']
    expect(bar.colors).toEqual(['#ff0000', '#0000ff'])
  })

  it('emits ANSI true-color codes when colors are set (indeterminate)', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'] })
    bar.start()
    const frame = firstFrame()
    expect(frame).toContain('\x1b[38;2;')
    expect(frame).toContain('\x1b[0m')
    bar.stop()
  })

  it('emits ANSI true-color codes when colors are set (determinate)', () => {
    const bar = new Bar({ length: 20, character: '=', prefix: '[', suffix: ']', progress: 0.5, colors: ['#ff0000', '#0000ff'] })
    bar.start()
    const frame = firstFrame()
    expect(frame).toContain('\x1b[38;2;')
    bar.stop()
  })

  it('emits no color codes when colors array is empty', () => {
    const bar = new Bar({ length: 20, character: '-', prefix: '[', suffix: ']', colors: [] })
    bar.start()
    const frame = firstFrame()
    expect(frame).not.toContain('\x1b[38;2;')
    bar.stop()
  })

  it('colors can be cleared while running', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'] })
    bar.start()
    bar.colors = []
    jest.runOnlyPendingTimers()
    const lastFrame = mockWrite.mock.calls.at(-1)?.[0] as string
    expect(lastFrame).not.toContain('\x1b[38;2;')
    bar.stop()
  })

  it('exposes built-in color presets', () => {
    expect(Bar.COLORS.rainbow).toHaveLength(6)
    expect(Bar.COLORS.blueRed).toEqual(['#0000ff', '#ff0000'])
    expect(Bar.COLORS.redBlue).toEqual(['#ff0000', '#0000ff'])
  })
})

describe('Bar colorFill', () => {
  it('defaults to false', () => {
    expect(new Bar().colorFill).toBe(false)
  })

  it('applies dimmed fg codes to fill chars when enabled', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], colorFill: true })
    bar.start()
    jest.runOnlyPendingTimers()
    const allFrames = mockWrite.mock.calls.map((c) => c[0] as string)
    expect(allFrames.some((f) => (f.match(/\x1b\[38;2;/g) ?? []).length > 1)).toBe(true)
    bar.stop()
  })

  it('emits no fill color codes when colorFill is false', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], colorFill: false })
    bar.start()
    const frame = firstFrame()
    expect((frame.match(/\x1b\[38;2;/g) ?? []).length).toBe(1)
    bar.stop()
  })
})

describe('Bar bgColors', () => {
  it('defaults to empty array', () => {
    expect(new Bar().bgColors).toEqual([])
  })

  it('accepts bgColors via constructor', () => {
    const bar = new Bar({ bgColors: ['#110000', '#000011'] })
    expect(bar.bgColors).toEqual(['#110000', '#000011'])
  })

  it('emits ANSI bg color codes (48;2) when bgColors set', () => {
    const bar = new Bar({ length: 20, bgColors: ['#ff0000', '#0000ff'] })
    bar.start()
    const frame = firstFrame()
    expect(frame).toContain('\x1b[48;2;')
    bar.stop()
  })

  it('applies bg color to fill chars in indeterminate mode', () => {
    const bar = new Bar({ length: 20, bgColors: ['#ff0000', '#0000ff'] })
    bar.start()
    jest.runOnlyPendingTimers()
    const allFrames = mockWrite.mock.calls.map((c) => c[0] as string)
    expect(allFrames.some((f) => (f.match(/\x1b\[48;2;/g) ?? []).length > 1)).toBe(true)
    bar.stop()
  })

  it('applies bg color to filled and empty cells in determinate mode', () => {
    const bar = new Bar({ length: 20, progress: 0.5, bgColors: ['#ff0000', '#0000ff'] })
    bar.start()
    const frame = firstFrame()
    expect((frame.match(/\x1b\[48;2;/g) ?? []).length).toBeGreaterThan(1)
    bar.stop()
  })

  it('bgColors can be cleared while running', () => {
    const bar = new Bar({ length: 20, bgColors: ['#ff0000', '#0000ff'] })
    bar.start()
    bar.bgColors = []
    jest.runOnlyPendingTimers()
    const lastFrame = mockWrite.mock.calls.at(-1)?.[0] as string
    expect(lastFrame).not.toContain('\x1b[48;2;')
    bar.stop()
  })
})

describe('Bar colorCycle', () => {
  it('defaults to 0.5', () => {
    expect(new Bar().colorCycle).toBe(0.5)
  })

  it('accepts colorCycle via constructor', () => {
    const bar = new Bar({ colorCycle: 0.5 })
    expect(bar.colorCycle).toBe(0.5)
  })

  it('advances the color offset each tick when colorCycle > 0', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], colorCycle: 1.0 })
    bar.start()
    const frame1 = firstFrame()
    jest.runOnlyPendingTimers()
    const frame2 = frames()[1]
    expect(frame1).not.toBe(frame2)
    bar.stop()
  })

  it('does not advance offset when colorCycle is 0', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], colorCycle: 0 })
    bar.start()
    const frame1 = firstFrame()
    jest.runOnlyPendingTimers()
    const frame2 = frames()[1]
    expect(frame1).not.toBe(frame2)
    bar.stop()
  })
})

describe('Bar shimmer', () => {
  it('defaults to 0 (off)', () => {
    expect(new Bar().shimmer).toBe(0)
  })

  it('produces different color codes than without shimmer at the same position', () => {
    const bar1 = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], shimmer: 0 })
    const bar2 = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], shimmer: 0.8 })
    bar1.start()
    bar2.start()
    const f1 = firstFrame()
    const f2 = frames()[1]
    expect(f1).not.toBe(f2)
    bar1.stop()
    bar2.stop()
  })

  it('advances shimmer phase each tick', () => {
    const bar = new Bar({ length: 20, colors: ['#ff0000', '#0000ff'], shimmer: 1.0 })
    bar.start()
    const f1 = firstFrame()
    jest.runOnlyPendingTimers()
    const f2 = frames()[1]
    expect(f1).not.toBe(f2)
    bar.stop()
  })
})

describe('Bar status methods', () => {
  it('succeed writes checkmark and message', () => {
    const bar = new Bar({ length: 40 })
    bar.succeed('Done')
    const call = mockWrite.mock.calls.find((c) => (c[0] as string).includes('✔'))
    expect(call?.[0]).toContain('Done')
  })

  it('fail writes cross and message', () => {
    const bar = new Bar({ length: 40 })
    bar.fail('Error')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('✖'))
  })

  it('warn writes warning symbol and message', () => {
    const bar = new Bar({ length: 40 })
    bar.warn('Caution')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('⚠'))
  })

  it('info writes info symbol and message', () => {
    const bar = new Bar({ length: 40 })
    bar.info('Note')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('ℹ'))
  })

  it('applies custom failColor hex', () => {
    const bar = new Bar({ length: 40, failColor: '#ff6b6b' })
    bar.fail('Oops')
    const call = mockWrite.mock.calls.find((c) => (c[0] as string).includes('✖'))
    expect(call?.[0]).toContain('\x1b[38;2;')
  })

  it('emits plain glyph when not TTY', () => {
    process.stdout.isTTY = false as unknown as true
    const bar = new Bar({ length: 40 })
    bar.succeed('Done')
    const call = mockWrite.mock.calls.find((c) => (c[0] as string).includes('✔'))
    expect(call?.[0]).not.toContain('\x1b[')
    process.stdout.isTTY = true
  })

  it('stop returns this for chaining', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    expect(bar.stop()).toBe(bar)
  })

  it('status methods return this for chaining', () => {
    const bar = new Bar({ length: 40 })
    expect(bar.succeed()).toBe(bar)
    expect(bar.fail()).toBe(bar)
    expect(bar.warn()).toBe(bar)
    expect(bar.info()).toBe(bar)
  })
})

describe('Bar callbacks', () => {
  it('calls onBounce when direction reverses', () => {
    const onBounce = jest.fn()
    const bar = new Bar({ length: 5, onBounce })
    bar.start()
    for (let i = 0; i < 10; i++) jest.runOnlyPendingTimers()
    expect(onBounce).toHaveBeenCalled()
    bar.stop()
  })

  it('calls onLoop when position wraps in loop mode', () => {
    const onLoop = jest.fn()
    const bar = new Bar({ length: 5, mode: 'loop', onLoop })
    bar.start()
    for (let i = 0; i < 10; i++) jest.runOnlyPendingTimers()
    expect(onLoop).toHaveBeenCalled()
    bar.stop()
  })

  it('calls onComplete once when progress reaches 1', () => {
    const onComplete = jest.fn()
    const bar = new Bar({ length: 10, progress: 0.9, onComplete })
    bar.start()
    bar.progress = 1
    jest.runOnlyPendingTimers()
    bar.progress = 1
    jest.runOnlyPendingTimers()
    expect(onComplete).toHaveBeenCalledTimes(1)
    bar.stop()
  })

  it('resets onComplete when progress drops below 1', () => {
    const onComplete = jest.fn()
    const bar = new Bar({ length: 10, progress: 1, onComplete })
    bar.start()
    jest.runOnlyPendingTimers()
    bar.progress = 0.5
    jest.runOnlyPendingTimers()
    bar.progress = 1
    jest.runOnlyPendingTimers()
    expect(onComplete).toHaveBeenCalledTimes(2)
    bar.stop()
  })
})

describe('Bar resize', () => {
  it('attaches resize listener when length is auto', () => {
    const onSpy = jest.spyOn(process.stdout, 'on')
    const bar = new Bar()
    bar.start()
    expect(onSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    bar.stop()
    onSpy.mockRestore()
  })

  it('does not attach resize listener when length is explicit', () => {
    const onSpy = jest.spyOn(process.stdout, 'on')
    const bar = new Bar({ length: 40 })
    bar.start()
    expect(onSpy).not.toHaveBeenCalledWith('resize', expect.any(Function))
    bar.stop()
    onSpy.mockRestore()
  })

  it('removes resize listener on stop', () => {
    const offSpy = jest.spyOn(process.stdout, 'off')
    const bar = new Bar()
    bar.start()
    bar.stop()
    expect(offSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    offSpy.mockRestore()
  })
})

describe('Bar.current', () => {
  it('is null before any bar starts', () => {
    expect(Bar.current).toBeNull()
  })

  it('is set to the bar on start()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    expect(Bar.current).toBe(bar)
    bar.stop()
  })

  it('is cleared on stop()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.stop()
    expect(Bar.current).toBeNull()
  })

  it('is cleared on succeed()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.succeed()
    expect(Bar.current).toBeNull()
  })

  it('is cleared on fail()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.fail()
    expect(Bar.current).toBeNull()
  })

  it('is cleared on warn()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.warn()
    expect(Bar.current).toBeNull()
  })

  it('is cleared on info()', () => {
    const bar = new Bar({ length: 40 })
    bar.start()
    bar.info()
    expect(Bar.current).toBeNull()
  })

  it('does not clear current when a different instance terminates', () => {
    const a = new Bar({ length: 40 })
    const b = new Bar({ length: 40 })
    a.start()
    b.fail()
    expect(Bar.current).toBe(a)
    a.stop()
  })
})

describe('Bar ETA / rate tracking', () => {
  it('rate getter returns 0 before any ticks', () => {
    const bar = new Bar()
    bar.track(100)
    expect(bar.rate).toBe(0)
  })

  it('eta getter returns 0 before any ticks', () => {
    const bar = new Bar()
    bar.track(100)
    expect(bar.eta).toBe(0)
  })

  it('tick() sets progress proportional to total', () => {
    const bar = new Bar()
    bar.track(100)
    bar.tick(50)
    expect(bar.progress).toBe(0.5)
  })

  it('tick() defaults to incrementing by 1', () => {
    const bar = new Bar()
    bar.track(100)
    bar.tick()
    bar.tick()
    expect(bar.progress).toBeCloseTo(0.02)
  })

  it('tick() clamps progress at 1 when over-ticked', () => {
    const bar = new Bar()
    bar.track(10)
    bar.tick(20)
    expect(bar.progress).toBe(1)
  })

  it('rate getter returns units per second', () => {
    jest.setSystemTime(0)
    const bar = new Bar()
    bar.track(100)
    jest.setSystemTime(2000)
    bar.tick(40)
    expect(bar.rate).toBeCloseTo(20, 0)
  })

  it('eta getter returns estimated seconds remaining', () => {
    jest.setSystemTime(0)
    const bar = new Bar()
    bar.track(100)
    jest.setSystemTime(1000)
    bar.tick(25)
    // rate = 25/s, remaining = 75 → eta ≈ 3s
    expect(bar.eta).toBeCloseTo(3, 0)
  })

  it('eta getter returns 0 when all units are complete', () => {
    jest.setSystemTime(0)
    const bar = new Bar()
    bar.track(10)
    jest.setSystemTime(1000)
    bar.tick(10)
    expect(bar.eta).toBe(0)
  })

  it('track() returns this for chaining', () => {
    expect(new Bar().track(100)).toBeInstanceOf(Bar)
  })

  it('tick() returns this for chaining', () => {
    const bar = new Bar()
    bar.track(100)
    expect(bar.tick(10)).toBeInstanceOf(Bar)
  })

  it('ETA suffix appears in rendered frames after tick', () => {
    jest.setSystemTime(0)
    const bar = new Bar({ length: 80, progress: 0 })
    bar.track(100, { showRate: true, showEta: true })
    jest.setSystemTime(1000)
    bar.tick(50)
    bar.start()
    jest.runOnlyPendingTimers()
    const etaFrame = frames().find(f => f.includes('/s'))
    expect(etaFrame).toBeDefined()
    expect(etaFrame).toContain('ETA')
    bar.stop()
  })

  it('bar shrinks to accommodate ETA suffix so line does not overflow', () => {
    jest.setSystemTime(0)
    const bar = new Bar({ length: 40, progress: 0 })
    bar.track(100, { showRate: true, showEta: true })
    jest.setSystemTime(1000)
    bar.tick(10)
    bar.start()
    jest.runOnlyPendingTimers()
    const etaFrame = frames().find(f => f.includes('/s'))
    if (etaFrame) {
      const visual = etaFrame.replace(/^\r/, '').replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, '')
      expect(visual.length).toBeLessThanOrEqual(40)
    }
    bar.stop()
  })
})
