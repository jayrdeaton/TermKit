import { Scrollbox, scrollbox } from '../../models/Scrollbox'

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

const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`)

beforeEach(() => {
  mockWrite.mockClear()
  process.stdout.isTTY = true
  process.stdin.isTTY = true
  process.stdout.columns = 80
})

afterEach(() => {
  process.stdout.isTTY = false
  process.stdin.isTTY = false
})

describe('Scrollbox - non-TTY', () => {
  it('throws when stdin is not a TTY', async () => {
    process.stdin.isTTY = false
    await expect(new Scrollbox().show(lines)).rejects.toThrow('interactive terminal')
  })
})

describe('Scrollbox - rendering', () => {
  it('renders lines on show()', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 1')
    expect(output).toContain('Line 5')
    expect(output).not.toContain('Line 6')
  })

  it('renders a title when provided', async () => {
    const p = new Scrollbox({ height: 5, title: 'My Output' }).show(lines)
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('My Output')
  })

  it('renders line numbers when lineNumbers is true', async () => {
    const p = new Scrollbox({ height: 3, lineNumbers: true }).show(['a', 'b', 'c'])
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('1')
    expect(output).toContain('2')
    expect(output).toContain('3')
  })

  it('shows footer with percentage', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toMatch(/\d+%/)
  })

  it('shows 100% when content fits in height', async () => {
    const p = new Scrollbox({ height: 20 }).show(['a', 'b', 'c'])
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('100%')
  })
})

describe('Scrollbox - navigation', () => {
  it('down arrow scrolls down', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('\x1b[B')
    press('q')
    await p
    const calls = mockWrite.mock.calls.map((c) => c[0] as string)
    const lastRender = calls.join('')
    expect(lastRender).toContain('Line 2')
  })

  it('j key scrolls down like down arrow', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('j')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 2')
  })

  it('k key scrolls up', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('\x1b[B')
    press('\x1b[B')
    press('k')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 1')
  })

  it('G jumps to end', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('G')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 20')
  })

  it('g jumps to top after scrolling', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('G')
    press('g')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 1')
  })

  it('space scrolls down by height', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press(' ')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 6')
  })

  it('b scrolls up by height', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press(' ')
    press('b')
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Line 1')
  })
})

describe('Scrollbox - close keys', () => {
  it('enter closes the scrollbox', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('\r')
    await expect(p).resolves.toBeUndefined()
  })

  it('escape closes the scrollbox', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('\x1b')
    await expect(p).resolves.toBeUndefined()
  })

  it('q closes the scrollbox', async () => {
    const p = new Scrollbox({ height: 5 }).show(lines)
    press('q')
    await expect(p).resolves.toBeUndefined()
  })
})

describe('scrollbox() convenience function', () => {
  it('throws when stdin is not a TTY', async () => {
    process.stdin.isTTY = false
    await expect(scrollbox(lines)).rejects.toThrow('interactive terminal')
  })

  it('resolves when q is pressed', async () => {
    const p = scrollbox(lines, { height: 5 })
    press('q')
    await expect(p).resolves.toBeUndefined()
  })

  it('passes options to the Scrollbox instance', async () => {
    const p = scrollbox(['hello'], { height: 5, title: 'Test Title' })
    press('q')
    await p
    const output = mockWrite.mock.calls.map((c) => c[0] as string).join('')
    expect(output).toContain('Test Title')
  })
})
