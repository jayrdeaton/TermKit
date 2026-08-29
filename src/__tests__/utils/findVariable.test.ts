import { Variable } from '../../models/Variable'
import { coerce, findVariable } from '../../utils/findVariable'

describe('coerce — numeric types', () => {
  it('converts a string to number', () => {
    expect(coerce('42', 'number', null)).toBe(42)
  })

  it('converts a float string to number', () => {
    expect(coerce('3.14', 'number', null)).toBeCloseTo(3.14)
  })

  it('converts a string to integer', () => {
    expect(coerce('7', 'integer', null)).toBe(7)
  })

  it('throws for a float when type is integer', () => {
    expect(() => coerce('3.5', 'integer', null)).toThrow('expected an integer')
  })

  it('throws when number is below min', () => {
    expect(() => coerce('4', 'number', null, 5)).toThrow('>= 5')
  })

  it('throws when number is above max', () => {
    expect(() => coerce('11', 'number', null, null, 10)).toThrow('<= 10')
  })

  it('accepts a number equal to min', () => {
    expect(coerce('5', 'number', null, 5)).toBe(5)
  })

  it('accepts a number equal to max', () => {
    expect(coerce('10', 'number', null, null, 10)).toBe(10)
  })
})

describe('coerce — string type', () => {
  it('returns the string unchanged', () => {
    expect(coerce('hello', 'string', null)).toBe('hello')
  })

  it('throws when string is shorter than min', () => {
    expect(() => coerce('ab', 'string', null, 5)).toThrow('at least 5 characters')
  })

  it('throws when string is longer than max', () => {
    expect(() => coerce('toolong', 'string', null, null, 3)).toThrow('at most 3 characters')
  })

  it('accepts string with length equal to min', () => {
    expect(coerce('abc', 'string', null, 3)).toBe('abc')
  })

  it('accepts string with length equal to max', () => {
    expect(coerce('abc', 'string', null, null, 3)).toBe('abc')
  })
})

describe('coerce — boolean type', () => {
  it('returns true for "true"', () => {
    expect(coerce('true', 'boolean', null)).toBe(true)
  })

  it('returns false for any other string', () => {
    expect(coerce('false', 'boolean', null)).toBe(false)
    expect(coerce('0', 'boolean', null)).toBe(false)
    expect(coerce('yes', 'boolean', null)).toBe(false)
  })
})

describe('coerce — enum type', () => {
  it('returns the value when it is in the enum', () => {
    expect(coerce('b', 'enum', ['a', 'b', 'c'])).toBe('b')
  })

  it('throws when value is not in the enum', () => {
    expect(() => coerce('z', 'enum', ['a', 'b'])).toThrow('expected one of: a, b')
  })
})

describe('findVariable — single value', () => {
  const noCommands: string[] = []

  it('reads and shifts the first value from the array', async () => {
    const arr = ['hello', 'world']
    const v = new Variable({ name: 'word', required: true, type: 'string' })
    expect(await findVariable(arr, v, noCommands)).toBe('hello')
    expect(arr).toEqual(['world'])
  })

  it('returns true for an optional variable when array is empty', async () => {
    const v = new Variable({ name: 'opt', type: 'string' })
    expect(await findVariable([], v, noCommands)).toBe(true)
  })

  it('throws for a required variable when array is empty', async () => {
    const v = new Variable({ name: 'file', required: true, type: 'string' })
    await expect(findVariable([], v, noCommands)).rejects.toThrow('Missing required variable')
  })

  it('applies the default when array is empty', async () => {
    const v = new Variable({ name: 'port', default: '3000', type: 'number' })
    expect(await findVariable([], v, noCommands)).toBe(3000)
  })

  it('does not consume a flag-like argument', async () => {
    const arr = ['--flag', 'value']
    const v = new Variable({ name: 'opt', type: 'string' })
    expect(await findVariable(arr, v, noCommands)).toBe(true)
    expect(arr).toHaveLength(2)
  })

  it('does not consume a known subcommand name', async () => {
    const arr = ['start', 'arg']
    const v = new Variable({ name: 'opt', type: 'string' })
    expect(await findVariable(arr, v, ['help', 'start'])).toBe(true)
    expect(arr).toHaveLength(2)
  })
})

describe('findVariable — array mode', () => {
  const noCommands: string[] = []

  it('collects all non-flag values from the array', async () => {
    const arr = ['a', 'b', 'c']
    const v = new Variable({ name: 'files', array: true, type: 'string' })
    expect(await findVariable(arr, v, noCommands)).toEqual(['a', 'b', 'c'])
    expect(arr).toHaveLength(0)
  })

  it('stops collecting at a flag', async () => {
    const arr = ['a', 'b', '--flag']
    const v = new Variable({ name: 'files', array: true, type: 'string' })
    expect(await findVariable(arr, v, noCommands)).toEqual(['a', 'b'])
    expect(arr).toEqual(['--flag'])
  })

  it('stops collecting at a subcommand name', async () => {
    const arr = ['a', 'sub', 'b']
    const v = new Variable({ name: 'files', array: true, type: 'string' })
    expect(await findVariable(arr, v, ['sub'])).toEqual(['a'])
    expect(arr).toEqual(['sub', 'b'])
  })

  it('returns true when no values collected and not required', async () => {
    const v = new Variable({ name: 'files', array: true, type: 'string' })
    expect(await findVariable([], v, noCommands)).toBe(true)
  })

  it('throws when no values collected and required', async () => {
    const v = new Variable({ name: 'files', array: true, required: true, type: 'string' })
    await expect(findVariable([], v, noCommands)).rejects.toThrow('Missing required variable')
  })

  it('coerces each collected value', async () => {
    const arr = ['1', '2', '3']
    const v = new Variable({ name: 'nums', array: true, type: 'number' })
    expect(await findVariable(arr, v, noCommands)).toEqual([1, 2, 3])
  })
})
