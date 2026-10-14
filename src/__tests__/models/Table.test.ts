import { Table } from '../../models/Table'

const strip = (s: string) => s.replace(/\x1b\[[^a-zA-Z]*[a-zA-Z]/g, '')

describe('Table constructor - basic rendering', () => {
  it('produces a non-empty string', () => {
    const t = new Table([{ name: 'Alice', age: 30 }])
    expect(t.string.length).toBeGreaterThan(0)
  })

  it('includes column headers', () => {
    const t = new Table([{ name: 'Alice' }])
    expect(strip(t.string)).toContain('name')
  })

  it('includes row values', () => {
    const t = new Table([{ name: 'Alice' }])
    expect(strip(t.string)).toContain('Alice')
  })

  it('derives the first encountered key as a column when no columns option is given', () => {
    const t = new Table([{ name: 'Alice', age: 30 }])
    expect(Object.keys(t.columns)).toContain('name')
  })

  it('default separator is |', () => {
    const t = new Table([{ a: 1, b: 2 }], { columns: ['a', 'b'] })
    expect(t.separator).toBe('|')
    expect(strip(t.string)).toContain('|')
  })

  it('uses a custom separator', () => {
    const t = new Table([{ a: 1, b: 2 }], { columns: ['a', 'b'], separator: '  ' })
    expect(strip(t.string)).toContain('  ')
  })
})

describe('Table constructor - explicit columns', () => {
  it('only renders columns listed in options', () => {
    const rows = [{ name: 'Alice', secret: 'hidden' }]
    const t = new Table(rows, { columns: ['name'] })
    expect(strip(t.string)).toContain('Alice')
    expect(strip(t.string)).not.toContain('hidden')
    expect(strip(t.string)).not.toContain('secret')
  })

  it('accepts column option objects with titles', () => {
    const t = new Table([{ n: 'Alice' }], { columns: [{ key: 'n', title: 'Name' }] })
    expect(strip(t.string)).toContain('Name')
    expect(strip(t.string)).toContain('Alice')
  })

  it('hides a column marked as hidden', () => {
    const rows = [{ name: 'Alice', id: 1 }]
    const t = new Table(rows, { columns: [{ key: 'name' }, { key: 'id', hidden: true }] })
    expect(Object.keys(t.columns)).not.toContain('id')
    expect(strip(t.string)).not.toContain('id')
  })

  it('uses a custom value function', () => {
    const rows = [{ price: 9.99 }]
    const t = new Table(rows, { columns: [{ key: 'price', value: (v) => `$${v}` }] })
    expect(strip(t.string)).toContain('$9.99')
  })
})

describe('Table width getter', () => {
  it('returns a positive number for a non-empty table', () => {
    const t = new Table([{ a: 1 }])
    expect(t.width).toBeGreaterThan(0)
  })

  it('increases with more explicit columns', () => {
    const t1 = new Table([{ a: 1 }], { columns: ['a'] })
    const t2 = new Table([{ a: 1, bb: 2, ccc: 3 }], { columns: ['a', 'bb', 'ccc'] })
    expect(t2.width).toBeGreaterThan(t1.width)
  })
})

describe('Table - title option', () => {
  it('includes the title in the output', () => {
    const t = new Table([{ x: 1 }], { title: 'My Table' })
    expect(strip(t.string)).toContain('My Table')
  })

  it('omits title when not provided', () => {
    const t = new Table([{ x: 1 }])
    expect(strip(t.string)).not.toContain('My Table')
  })
})

describe('Table - meta rows', () => {
  it('includes meta row values in the output', () => {
    const rows = [{ label: 'Alice', score: 10 }]
    const meta = [{ label: 'Total', score: 10 }]
    const t = new Table(rows, { meta })
    expect(strip(t.string)).toContain('Total')
  })

  it('pads columns wide enough to fit meta values', () => {
    const rows = [{ label: 'A', score: 1 }]
    const meta = [{ label: 'Grand total', score: 100 }]
    const t = new Table(rows, { meta })
    expect(strip(t.string)).toContain('Grand total')
  })
})

describe('Table - align option', () => {
  it('accepts left align', () => {
    const t = new Table([{ x: 1 }], { align: 'left' })
    expect(t.align).toBe('left')
  })

  it('accepts right align', () => {
    const t = new Table([{ x: 1 }], { align: 'right' })
    expect(t.align).toBe('right')
  })

  it('accepts center align', () => {
    const t = new Table([{ x: 1 }], { align: 'center' })
    expect(t.align).toBe('center')
  })
})

describe('Table - margin option', () => {
  it('defaults to 0', () => {
    const t = new Table([{ x: 1 }])
    expect(t.margin).toBe(0)
  })

  it('widens the output when margin > 0', () => {
    const t0 = new Table([{ x: 1 }], { margin: 0 })
    const t2 = new Table([{ x: 1 }], { margin: 2 })
    expect(t2.width).toBeGreaterThan(t0.width)
  })
})

describe('Table - print()', () => {
  it('writes to process.stdout', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const t = new Table([{ x: 1 }])
    t.print()
    expect(spy).toHaveBeenCalledWith(t.string + '\n')
    spy.mockRestore()
  })
})

describe('Table - static alignment constants', () => {
  it('exposes left, center, right constants', () => {
    expect(Table.left).toBe('left')
    expect(Table.center).toBe('center')
    expect(Table.right).toBe('right')
  })
})
