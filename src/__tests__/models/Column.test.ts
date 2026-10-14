import { Column } from '../../models/Column'

describe('Column - string shorthand', () => {
  it('sets key and title from a plain string', () => {
    const col = new Column('name')
    expect(col.key).toBe('name')
    expect(col.title).toBe('name')
  })

  it('sets padding to the title length', () => {
    const col = new Column('hello')
    expect(col.padding).toBe(5)
  })
})

describe('Column - options object', () => {
  it('accepts a key with an explicit title', () => {
    const col = new Column({ key: 'n', title: 'Name' })
    expect(col.key).toBe('n')
    expect(col.title).toBe('Name')
  })

  it('defaults title to key when not provided', () => {
    const col = new Column({ key: 'id' })
    expect(col.title).toBe('id')
  })

  it('respects an explicit padding value', () => {
    const col = new Column({ key: 'x', padding: 20 })
    expect(col.padding).toBe(20)
  })

  it('bumps padding up to the title length when padding is smaller', () => {
    const col = new Column({ key: 'x', title: 'LongTitle', padding: 2 })
    expect(col.padding).toBe(9)
  })

  it('respects minimumPadding when it exceeds title length', () => {
    const col = new Column({ key: 'x', title: 'Hi', minimumPadding: 10 })
    expect(col.padding).toBe(10)
  })

  it('does not reduce padding below title length via minimumPadding', () => {
    const col = new Column({ key: 'x', title: 'LongTitle', minimumPadding: 3 })
    expect(col.padding).toBe(9)
  })

  it('stores align when provided', () => {
    const col = new Column({ key: 'x', align: 'right' })
    expect(col.align).toBe('right')
  })

  it('stores hidden when true', () => {
    const col = new Column({ key: 'x', hidden: true })
    expect(col.hidden).toBe(true)
  })

  it('uses the custom value function', () => {
    const col = new Column({ key: 'price', value: (v) => `$${v}` })
    expect(col.value(9.99)).toBe('$9.99')
  })

  it('default value function returns empty string for null', () => {
    const col = new Column({ key: 'x' })
    expect(col.value(null)).toBe('')
  })

  it('default value function returns empty string for undefined', () => {
    const col = new Column({ key: 'x' })
    expect(col.value(undefined)).toBe('')
  })

  it('default value function stringifies numbers', () => {
    const col = new Column({ key: 'x' })
    expect(col.value(42)).toBe('42')
  })
})
