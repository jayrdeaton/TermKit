import { config } from '../../config'
import { markup } from '../../models/Markup'

beforeEach(() => {
  process.stdout.isTTY = true
  config.colors = true
})

afterEach(() => {
  process.stdout.isTTY = false
  config.colors = false
})

describe('markup()', () => {
  it('returns a string for undefined', () => {
    expect(typeof markup()).toBe('string')
  })

  it('contains "undefined" for undefined input', () => {
    expect(markup(undefined)).toContain('undefined')
  })

  it('returns a string for null', () => {
    expect(typeof markup(null)).toBe('string')
  })

  it('contains "null" for null input', () => {
    expect(markup(null)).toContain('null')
  })
})

describe('markup(string)', () => {
  it('returns a string', () => {
    expect(typeof markup('hello')).toBe('string')
  })

  it('contains the value without quotes', () => {
    const result = markup('hello')
    expect(result).toContain('hello')
    expect(result).not.toContain("'hello'")
  })
})

describe('markup(number)', () => {
  it('returns a string', () => {
    expect(typeof markup(42)).toBe('string')
  })

  it('contains the value', () => {
    expect(markup(42)).toContain('42')
  })
})

describe('markup(bigint)', () => {
  it('returns a string', () => {
    expect(typeof markup(BigInt(99))).toBe('string')
  })

  it('contains the value', () => {
    expect(markup(BigInt(99))).toContain('99')
  })
})

describe('markup(boolean)', () => {
  it('returns a string for true', () => {
    expect(typeof markup(true)).toBe('string')
  })

  it('contains the value', () => {
    expect(markup(false)).toContain('false')
  })
})

describe('markup(symbol)', () => {
  it('returns a string', () => {
    expect(typeof markup(Symbol('id'))).toBe('string')
  })

  it('contains the symbol description', () => {
    expect(markup(Symbol('id'))).toContain('id')
  })
})

describe('markup(Date)', () => {
  it('returns a string', () => {
    expect(typeof markup(new Date())).toBe('string')
  })
})

describe('markup(array)', () => {
  it('returns a string', () => {
    expect(typeof markup(['a', 'b'])).toBe('string')
  })

  it('contains array values', () => {
    const result = markup(['foo', 'bar'])
    expect(result).toContain('foo')
    expect(result).toContain('bar')
  })

  it('handles empty array', () => {
    expect(markup([])).toContain('[]')
  })

  it('separates entries with commas', () => {
    expect(markup(['a', 'b', 'c'])).toContain(',')
  })
})

describe('markup(object)', () => {
  it('returns a string', () => {
    expect(typeof markup({ a: 1, b: 2 })).toBe('string')
  })

  it('contains object keys', () => {
    const result = markup({ name: 'kit', version: 2 })
    expect(result).toContain('name')
    expect(result).toContain('version')
  })

  it('handles empty object', () => {
    expect(markup({})).toContain('{}')
  })

  it('handles nested objects', () => {
    const result = markup({ outer: { inner: 'value' } })
    expect(result).toContain('outer')
    expect(result).toContain('inner')
    expect(result).toContain('value')
  })

  it('separates entries with commas', () => {
    expect(markup({ a: 1, b: 2, c: 3 })).toContain(',')
  })
})

describe('markup(data, { translations })', () => {
  it('applies translation to matching key', () => {
    const result = markup({ score: 100 }, { translations: { score: (v) => `${v}pts` } })
    expect(result).toContain('100pts')
  })
})

describe('markup(data, { styles })', () => {
  it('applies custom string style', () => {
    const result = markup('hello', { styles: { string: (v) => `>>>${v}<<<` } })
    expect(result).toContain('>>>hello<<<')
  })

  it('applies custom number style', () => {
    const result = markup(7, { styles: { number: (v) => `NUM:${v}` } })
    expect(result).toContain('NUM:7')
  })

  it('applies custom null style', () => {
    const result = markup(null, { styles: { null: (v) => `EMPTY:${v}` } })
    expect(result).toContain('EMPTY:null')
  })

  it('applies custom undefined style', () => {
    const result = markup(undefined, { styles: { undefined: (v) => `MISSING:${v}` } })
    expect(result).toContain('MISSING:undefined')
  })

  it('applies custom boolean style', () => {
    const result = markup(true, { styles: { boolean: (v) => `BOOL:${v}` } })
    expect(result).toContain('BOOL:true')
  })
})

describe('markup - TTY colors', () => {
  it('includes ANSI codes in TTY mode', () => {
    const result = markup('hello')
    expect(result).toContain('\x1b[')
  })

  it('omits ANSI codes when colors disabled', () => {
    process.stdout.isTTY = false
    config.colors = false
    const result = markup('hello')
    expect(result).not.toContain('\x1b[')
  })

  it('number and boolean use different ANSI codes', () => {
    process.stdout.isTTY = true
    const num = markup(1)
    const bool = markup(true)
    const numCode = num.match(/\x1b\[(\d+)m/)?.[1]
    const boolCode = bool.match(/\x1b\[(\d+)m/)?.[1]
    expect(numCode).not.toBe(boolCode)
  })
})
