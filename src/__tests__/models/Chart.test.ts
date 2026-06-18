import * as Chart from '../../models/Chart'

const strip = (s: string) => s.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, '')

// Fix a column width so bar widths are deterministic. writable:true so a later
// test in the same jest worker can reassign process.stdout.columns — without it
// the property is read-only and plain assignment elsewhere (e.g. Scrollbox) throws.
beforeEach(() => {
  Object.defineProperty(process.stdout, 'columns', { value: 80, configurable: true, writable: true })
})

// ── Chart.Bar ─────────────────────────────────────────────────────────────────

describe('Chart.Bar — toString()', () => {
  it('returns a non-empty string', () => {
    const c = new Chart.Bar([{ value: 10 }, { value: 20 }])
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('contains the numeric values', () => {
    const c = new Chart.Bar([{ value: 10 }, { value: 20 }])
    const out = strip(c.toString())
    expect(out).toContain('10')
    expect(out).toContain('20')
  })

  it('contains key labels when provided', () => {
    const c = new Chart.Bar([{ key: 'Alpha', value: 5 }])
    const out = strip(c.toString())
    expect(out).toContain('Alpha')
  })

  it('inserts a blank line for null items', () => {
    const c = new Chart.Bar([{ value: 5 }, null, { value: 10 }])
    expect(c.toString().split('\n').length).toBeGreaterThanOrEqual(3)
  })

  it('uses a custom character', () => {
    const c = new Chart.Bar([{ value: 5, character: '=' }])
    expect(c.toString()).toContain('=')
  })

  it('applies a custom style function', () => {
    const style = jest.fn((s: string) => `>>>${s}<<<`)
    const c = new Chart.Bar([{ value: 5, style }])
    expect(c.toString()).toContain('>>>')
    expect(style).toHaveBeenCalled()
  })

  it('respects paddingX and paddingY options', () => {
    const withPad = new Chart.Bar([{ value: 5 }], { paddingX: 2, paddingY: 1 })
    const noPad = new Chart.Bar([{ value: 5 }])
    expect(withPad.toString().length).toBeGreaterThan(noPad.toString().length)
  })
})

describe('Chart.Bar — print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    new Chart.Bar([{ value: 5 }]).print()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── Chart.VerticalBar ──────────────────────────────────────────────────────────────

describe('Chart.VerticalBar — toString()', () => {
  it('returns a non-empty string', () => {
    const c = new Chart.VerticalBar([{ value: 5 }, { value: 10 }])
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('includes a horizontal baseline', () => {
    const c = new Chart.VerticalBar([{ value: 5 }])
    expect(c.toString()).toContain('─')
  })

  it('renders key labels when provided', () => {
    const c = new Chart.VerticalBar([{ key: 'A', value: 3 }, { key: 'B', value: 7 }])
    const out = strip(c.toString())
    expect(out).toContain('A')
    expect(out).toContain('B')
  })

  it('skips label row when no keys are provided', () => {
    const c = new Chart.VerticalBar([{ value: 5 }])
    // No label line after baseline
    const lines = c.toString().split('\n').filter(Boolean)
    const baseIdx = lines.findIndex(l => l.includes('─'))
    expect(baseIdx).toBe(lines.length - 1)
  })

  it('inserts blank column for null items', () => {
    const c = new Chart.VerticalBar([{ value: 10 }, null, { value: 5 }], { colWidth: 1 })
    const lines = c.toString().split('\n')
    expect(lines.length).toBeGreaterThan(2)
  })

  it('applies a custom style function to filled cells', () => {
    const style = jest.fn((s: string) => `!!${s}!!`)
    const c = new Chart.VerticalBar([{ value: 10, style }], { height: 3 })
    expect(c.toString()).toContain('!!')
    expect(style).toHaveBeenCalled()
  })

  it('respects the height option', () => {
    const short = new Chart.VerticalBar([{ value: 5 }], { height: 3 })
    const tall = new Chart.VerticalBar([{ value: 5 }], { height: 10 })
    const shortLines = short.toString().split('\n').filter(Boolean).length
    const tallLines = tall.toString().split('\n').filter(Boolean).length
    expect(tallLines).toBeGreaterThan(shortLines)
  })

  it('respects paddingX and paddingY options', () => {
    const withPad = new Chart.VerticalBar([{ value: 5 }], { paddingX: 2, paddingY: 1 })
    const noPad = new Chart.VerticalBar([{ value: 5 }])
    expect(withPad.toString().length).toBeGreaterThan(noPad.toString().length)
  })
})

describe('Chart.VerticalBar — print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    new Chart.VerticalBar([{ value: 5 }]).print()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── Chart.Heatmap ─────────────────────────────────────────────────────────────

describe('Chart.Heatmap — toString()', () => {
  const data = [
    [0, 0.5, 1],
    [1, 0.5, 0],
  ]

  it('returns a non-empty string', () => {
    const c = new Chart.Heatmap(data)
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('contains ANSI background color codes', () => {
    const c = new Chart.Heatmap(data)
    expect(c.toString()).toContain('\x1b[48;2;')
  })

  it('renders row labels when provided', () => {
    const c = new Chart.Heatmap(data, { rowLabels: ['Row1', 'Row2'] })
    expect(strip(c.toString())).toContain('Row1')
    expect(strip(c.toString())).toContain('Row2')
  })

  it('renders column labels when provided', () => {
    const c = new Chart.Heatmap(data, { colLabels: ['A', 'B', 'C'] })
    expect(strip(c.toString())).toContain('A')
    expect(strip(c.toString())).toContain('B')
  })

  it('uses custom min/max when provided', () => {
    const c = new Chart.Heatmap([[5]], { min: 0, max: 10 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('respects paddingX and paddingY options', () => {
    const withPad = new Chart.Heatmap(data, { paddingX: 2, paddingY: 1 })
    const noPad = new Chart.Heatmap(data)
    expect(withPad.toString().length).toBeGreaterThan(noPad.toString().length)
  })
})

describe('Chart.Heatmap — print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    new Chart.Heatmap([[0, 1]]).print()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── Chart.Scatter ─────────────────────────────────────────────────────────────

describe('Chart.Scatter — toString()', () => {
  const data = [
    { x: 1, y: 1 },
    { x: 2, y: 3 },
    { x: 3, y: 2 },
  ]

  it('returns a non-empty string', () => {
    const c = new Chart.Scatter(data, { width: 30, height: 10 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('contains the default point character', () => {
    const c = new Chart.Scatter(data, { width: 30, height: 10 })
    expect(c.toString()).toContain('•')
  })

  it('uses a custom character', () => {
    const c = new Chart.Scatter(data, { character: 'x', width: 30, height: 10 })
    expect(c.toString()).toContain('x')
  })

  it('renders axes by default (includes │ and └)', () => {
    const c = new Chart.Scatter(data, { width: 30, height: 8 })
    const out = c.toString()
    expect(out).toContain('│')
    expect(out).toContain('└')
  })

  it('omits axes when axes: false', () => {
    const c = new Chart.Scatter(data, { axes: false, width: 30, height: 8 })
    const out = c.toString()
    expect(out).not.toContain('│')
    expect(out).not.toContain('└')
  })

  it('applies a custom style function', () => {
    const style = jest.fn((s: string) => `[${s}]`)
    const c = new Chart.Scatter([{ x: 1, y: 1, style }], { width: 20, height: 8 })
    expect(c.toString()).toContain('[')
    expect(style).toHaveBeenCalled()
  })

  it('handles a single point without crashing (xMin === xMax guard)', () => {
    const c = new Chart.Scatter([{ x: 5, y: 5 }], { width: 20, height: 8 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('handles an empty data array', () => {
    const c = new Chart.Scatter([], { width: 20, height: 8 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('respects explicit xMin/xMax/yMin/yMax', () => {
    const c = new Chart.Scatter(data, { xMin: 0, xMax: 10, yMin: 0, yMax: 10, width: 30, height: 8 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('respects paddingX and paddingY options', () => {
    const withPad = new Chart.Scatter(data, { paddingX: 2, paddingY: 1, width: 30, height: 8 })
    const noPad = new Chart.Scatter(data, { width: 30, height: 8 })
    expect(withPad.toString().length).toBeGreaterThan(noPad.toString().length)
  })
})

describe('Chart.Scatter — print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    new Chart.Scatter([{ x: 1, y: 1 }], { width: 20, height: 8 }).print()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── Chart.Line ────────────────────────────────────────────────────────────────

describe('Chart.Line — toString()', () => {
  const data = [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }]

  it('returns a non-empty string', () => {
    const c = new Chart.Line(data, { width: 40, height: 10 })
    expect(c.toString().length).toBeGreaterThan(0)
  })

  it('renders axes by default', () => {
    const out = new Chart.Line(data, { width: 40, height: 10 }).toString()
    expect(out).toContain('│')
    expect(out).toContain('└')
  })

  it('omits axes when axes: false', () => {
    const out = new Chart.Line(data, { axes: false, width: 40, height: 10 }).toString()
    expect(out).not.toContain('│')
    expect(out).not.toContain('└')
  })

  it('contains the default point character', () => {
    expect(new Chart.Line(data, { width: 40, height: 10 }).toString()).toContain('•')
  })

  it('uses a custom character', () => {
    expect(new Chart.Line(data, { character: 'x', width: 40, height: 10 }).toString()).toContain('x')
  })

  it('fill option adds ░ below the line', () => {
    expect(new Chart.Line(data, { fill: true, width: 40, height: 10 }).toString()).toContain('░')
  })

  it('handles single point without crashing (xMin === xMax guard)', () => {
    expect(() => new Chart.Line([{ x: 5, y: 5 }], { width: 20, height: 8 })).not.toThrow()
  })

  it('handles empty data array', () => {
    expect(new Chart.Line([], { width: 20, height: 8 }).toString().length).toBeGreaterThan(0)
  })

  it('applies style function to points', () => {
    const style = jest.fn((s: string) => `[${s}]`)
    const c = new Chart.Line([{ x: 0, y: 0, style }, { x: 10, y: 10, style }], { width: 30, height: 8 })
    expect(c.toString()).toContain('[')
    expect(style).toHaveBeenCalled()
  })

  it('respects paddingX and paddingY options', () => {
    const withPad = new Chart.Line(data, { paddingX: 2, paddingY: 1, width: 30, height: 8 })
    const noPad = new Chart.Line(data, { width: 30, height: 8 })
    expect(withPad.toString().length).toBeGreaterThan(noPad.toString().length)
  })

  it('respects explicit axis bounds', () => {
    expect(() => new Chart.Line(data, { xMin: -5, xMax: 15, yMin: -5, yMax: 10, width: 30, height: 8 })).not.toThrow()
  })
})

describe('Chart.Line — print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    new Chart.Line([{ x: 0, y: 0 }, { x: 1, y: 1 }], { width: 20, height: 8 }).print()
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

// ── Chart.Sparkline ───────────────────────────────────────────────────────────

describe('Chart.Sparkline', () => {
  it('returns a string with one character per data point', () => {
    expect(Chart.Sparkline([1, 2, 3, 4, 5]).length).toBe(5)
  })

  it('maps minimum value to the lowest block character', () => {
    expect(Chart.Sparkline([0, 10])[0]).toBe(' ')
  })

  it('maps maximum value to the full block character', () => {
    expect(Chart.Sparkline([0, 10])[1]).toBe('█')
  })

  it('midpoint value maps to a mid-range block', () => {
    const result = Chart.Sparkline([0, 5, 10])
    expect(result[1]).not.toBe(' ')
    expect(result[1]).not.toBe('█')
  })

  it('handles uniform data without crashing', () => {
    expect(() => Chart.Sparkline([5, 5, 5])).not.toThrow()
    expect(Chart.Sparkline([5, 5, 5]).length).toBe(3)
  })

  it('respects explicit min/max options', () => {
    // value 5 out of 0-10 = 0.5, round(0.5 * 8) = 4, BLOCKS[4] = '▄'
    expect(Chart.Sparkline([5], { min: 0, max: 10 })).toBe('▄')
  })

  it('applies style function to the full result string', () => {
    const style = jest.fn((s: string) => `>>>${s}<<<`)
    const result = Chart.Sparkline([1, 2, 3], { style })
    expect(result.startsWith('>>>')).toBe(true)
    expect(result.endsWith('<<<')).toBe(true)
    expect(style).toHaveBeenCalledTimes(1)
  })
})
