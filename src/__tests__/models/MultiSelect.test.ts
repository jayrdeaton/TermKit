import { MultiSelect, multiSelect } from '../../models/MultiSelect'

if (!process.stdin.setRawMode) {
  ;(process.stdin as NodeJS.ReadStream).setRawMode = () => process.stdin as NodeJS.ReadStream
}

const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)
jest.spyOn(process.stdin, 'setRawMode').mockImplementation(() => process.stdin as any)
jest.spyOn(process.stdin, 'pause').mockImplementation(() => process.stdin)
jest.spyOn(process.stdin, 'resume').mockImplementation(() => process.stdin)

function press(key: string) {
  process.stdin.emit('data', Buffer.from(key))
}

const items = [{ label: 'Option A' }, { label: 'Option B' }, { label: 'Option C' }]

beforeEach(() => {
  mockWrite.mockClear()
  process.stdout.isTTY = true
  process.stdin.isTTY = true
  jest.useFakeTimers()
})

afterEach(() => {
  process.stdout.isTTY = false
  process.stdin.isTTY = false
  jest.useRealTimers()
})

describe('MultiSelect - non-TTY', () => {
  it('throws when stdin is not a TTY', async () => {
    process.stdin.isTTY = false
    await expect(new MultiSelect().ask('Pick:', items)).rejects.toThrow('interactive terminal')
  })
})

describe('MultiSelect - selection', () => {
  it('confirming with nothing toggled selects the item under the cursor', async () => {
    const p = new MultiSelect().ask('Pick:', items)
    press('\r')
    await expect(p).resolves.toEqual([{ label: 'Option A' }])
  })

  it('space toggles the current item and enter confirms it', async () => {
    const p = new MultiSelect().ask('Pick:', items)
    press('\x1b[B') // move to B
    press(' ') // toggle B
    press('\r')
    await expect(p).resolves.toEqual([{ label: 'Option B' }])
  })
})

describe('MultiSelect - terminal wrap', () => {
  it('disables auto-wrap while rendering and restores it on exit', async () => {
    const p = new MultiSelect().ask('Pick:', items)
    press('\r')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    // Wrap is disabled during render so wrapped rows can't desync the
    // CURSOR_UP redraw count and make the list march down the screen...
    expect(output).toContain('\x1b[?7l')
    // ...and re-enabled before resolving so later output wraps normally.
    expect(output).toContain('\x1b[?7h')
    expect(output.lastIndexOf('\x1b[?7h')).toBeGreaterThan(output.indexOf('\x1b[?7l'))
  })
})

describe('MultiSelect - terminal height', () => {
  const originalRows = process.stdout.rows
  afterEach(() => {
    process.stdout.rows = originalRows
  })

  it('caps the visible window to the terminal height so the list never scrolls', async () => {
    process.stdout.rows = 8
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `Item ${i + 1}` }))
    const p = new MultiSelect().ask('Pick:', many)
    const initial = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    press('\r')
    await p
    expect(initial).toContain('Item 1')
    expect(initial).not.toContain('Item 20')
  })

  it('shows the whole list when it fits in the terminal', async () => {
    process.stdout.rows = 40
    const p = new MultiSelect().ask('Pick:', [{ label: 'Alpha' }, { label: 'Beta' }, { label: 'Gamma' }])
    const initial = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    press('\r')
    await p
    expect(initial).toContain('Alpha')
    expect(initial).toContain('Gamma')
  })
})

describe('MultiSelect - absolute numbering with viewport', () => {
  const originalRows = process.stdout.rows
  afterEach(() => {
    process.stdout.rows = originalRows
  })

  it('numbers a scrolled row by its absolute position, not its window offset', async () => {
    process.stdout.rows = 8 // viewport smaller than the list, so it scrolls
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `Item ${i + 1}` }))
    const p = new MultiSelect().ask('Pick:', many)
    for (let i = 0; i < 11; i++) press('\x1b[B') // scroll the cursor down to Item 12
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    press('\r')
    await p
    // The window is only a few rows tall, so a window-relative number could
    // never reach "12." — seeing it proves the number is absolute.
    expect(output).toContain('12.')
    expect(output).toContain('Item 12')
  })

  it('digit quick-select jumps the cursor to the absolute item even when scrolled away', async () => {
    process.stdout.rows = 8
    const many = Array.from({ length: 20 }, (_, i) => ({ label: `Item ${i + 1}` }))
    const p = new MultiSelect().ask('Pick:', many)
    for (let i = 0; i < 11; i++) press('\x1b[B') // scroll away from the top of the list
    press('2') // jump the cursor to the absolute 2nd item, not the 2nd visible row
    press('\r') // confirm with nothing toggled selects the item under the cursor
    await expect(p).resolves.toEqual([{ label: 'Item 2' }])
  })
})

describe('multiSelect() convenience function', () => {
  it('resolves the selected items', async () => {
    const p = multiSelect('Pick:', items)
    press('\r')
    await expect(p).resolves.toEqual([{ label: 'Option A' }])
  })
})
