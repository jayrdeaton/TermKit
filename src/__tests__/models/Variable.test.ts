import { Variable } from '../../models/Variable'

describe('Variable defaults', () => {
  it('has correct default values', () => {
    const v = new Variable()
    expect(v.array).toBe(false)
    expect(v.default).toBeNull()
    expect(v.enum).toBeNull()
    expect(v.max).toBeNull()
    expect(v.min).toBeNull()
    expect(v.name).toBeNull()
    expect(v.raw).toBeNull()
    expect(v.required).toBe(false)
    expect(v.type).toBe('string')
    expect(v.value).toBeNull()
  })
})

describe('Variable constructor', () => {
  it('applies name, type, and required', () => {
    const v = new Variable({ name: 'port', type: 'number', required: true })
    expect(v.name).toBe('port')
    expect(v.type).toBe('number')
    expect(v.required).toBe(true)
  })

  it('applies enum and default', () => {
    const v = new Variable({ enum: ['a', 'b'], default: 'a' })
    expect(v.enum).toEqual(['a', 'b'])
    expect(v.default).toBe('a')
  })

  it('applies min and max', () => {
    const v = new Variable({ min: 1, max: 10 })
    expect(v.min).toBe(1)
    expect(v.max).toBe(10)
  })

  it('applies raw string', () => {
    const v = new Variable({ raw: '<port:number>' })
    expect(v.raw).toBe('<port:number>')
  })

  it('initializes value to [] when array is true', () => {
    const v = new Variable({ array: true })
    expect(v.array).toBe(true)
    expect(v.value).toEqual([])
  })

  it('leaves value null when array is false', () => {
    const v = new Variable({ array: false })
    expect(v.value).toBeNull()
  })
})

describe('Variable hint getter', () => {
  it('returns null when no hint parts', () => {
    expect(new Variable().hint).toBeNull()
  })

  it('returns null for plain string type with no constraints', () => {
    expect(new Variable({ type: 'string' }).hint).toBeNull()
  })

  it('includes enum values joined by |', () => {
    const v = new Variable({ type: 'enum', enum: ['a', 'b', 'c'] })
    expect(v.hint).toBe('(a|b|c)')
  })

  it('includes min-max range when both are set', () => {
    const v = new Variable({ min: 0, max: 100 })
    expect(v.hint).toBe('(0-100)')
  })

  it('includes >= constraint for min only', () => {
    const v = new Variable({ min: 5 })
    expect(v.hint).toBe('(>= 5)')
  })

  it('includes <= constraint for max only', () => {
    const v = new Variable({ max: 10 })
    expect(v.hint).toBe('(<= 10)')
  })

  it('includes default value', () => {
    const v = new Variable({ default: 'hello' })
    expect(v.hint).toBe('(default: hello)')
  })

  it('combines range and default', () => {
    const v = new Variable({ min: 1, max: 10, default: '5' })
    expect(v.hint).toBe('(1-10, default: 5)')
  })

  it('combines enum and default', () => {
    const v = new Variable({ type: 'enum', enum: ['x', 'y'], default: 'x' })
    expect(v.hint).toBe('(x|y, default: x)')
  })
})
