import { Log, log } from '../../models/Log'

const mockWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true)

beforeEach(() => {
  mockWrite.mockClear()
  process.stdout.isTTY = true
})

afterEach(() => {
  process.stdout.isTTY = false
})

describe('Log methods - TTY', () => {
  it('succeed writes ✔ glyph', () => {
    new Log().succeed('OK')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('✔'))
  })

  it('succeed includes the message', () => {
    new Log().succeed('All done')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('All done'))
  })

  it('fail writes ✖ glyph', () => {
    new Log().fail('Boom')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('✖'))
  })

  it('warn writes ⚠ glyph', () => {
    new Log().warn('Watch out')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('⚠'))
  })

  it('info writes ℹ glyph', () => {
    new Log().info('FYI')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('ℹ'))
  })

  it('writes a newline at the end', () => {
    new Log().succeed()
    expect(mockWrite).toHaveBeenCalledWith(expect.stringMatching(/\n$/))
  })

  it('omits trailing space when no message provided', () => {
    new Log().succeed()
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).not.toContain('undefined')
  })

  it('includes ANSI color codes', () => {
    new Log().succeed('Done')
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).toContain('\x1b[')
  })

  it('applies custom successColor hex', () => {
    new Log({ successColor: '#a855f7' }).succeed('Done')
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).toContain('\x1b[38;2;')
  })

  it('applies custom failColor hex', () => {
    new Log({ failColor: '#ff0000' }).fail('Oops')
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).toContain('\x1b[38;2;')
  })
})

describe('Log methods - non-TTY', () => {
  beforeEach(() => {
    process.stdout.isTTY = false
  })

  it('omits ANSI color codes', () => {
    new Log().succeed('Done')
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).not.toContain('\x1b[')
  })

  it('includes glyph when glyphs=true (default)', () => {
    new Log().succeed('Done')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('✔'))
  })

  it('omits glyph when glyphs=false', () => {
    new Log({ glyphs: false }).succeed('Done')
    const call = mockWrite.mock.calls[0][0] as string
    expect(call).not.toContain('✔')
  })

  it('writes ASCII glyph and message when glyphs=false', () => {
    new Log({ glyphs: false }).succeed('Hello')
    expect(mockWrite).toHaveBeenCalledWith('+ Hello\n')
  })

  it('writes ASCII glyph only when glyphs=false and no message', () => {
    new Log({ glyphs: false }).succeed()
    expect(mockWrite).toHaveBeenCalledWith('+\n')
  })
})

describe('log singleton', () => {
  it('is an instance of Log', () => {
    expect(log).toBeInstanceOf(Log)
  })

  it('succeed is callable on singleton', () => {
    log.succeed('test')
    expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('✔'))
  })
})
