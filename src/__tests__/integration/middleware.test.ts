import { Program } from '../..'

const { command, option, setDefaults } = Program

type OutputEntry = { name: string; options: unknown }

let output: OutputEntry[] = []

setDefaults({
  middlewares: [
    async (options) => {
      output.push({ name: 'default', options })
    }
  ]
})

const program = command('app', '[opt]')
  .options([option('a', 'array', '[arr...]', 'Option with array variable'), option('r', 'required', '<reqA>', 'Option with required variable'), option('o', 'optional', '[opt]', 'Option with optional variable'), option('b', 'boolean', null, 'Option with no variable')])
  .middleware(async (options) => {
    output.push({ name: 'middleware', options })
  })
  .action(async (options) => {
    output.push({ name: 'action', options })
  })
  .commands([
    command('nested')
      .options([option('a', 'array', '[arr...]', 'Option with array variable'), option('r', 'required', '<reqA>', 'Option with required variable'), option('o', 'optional', '[opt]', 'Option with optional variable'), option('b', 'boolean', null, 'Option with no variable')])
      .middleware(async (options) => {
        output.push({ name: 'nested middleware', options })
      })
      .action(async (options) => {
        output.push({ name: 'nested action', options })
      })
  ])

beforeEach(() => {
  output = []
})

describe('middleware execution order', () => {
  it('runs default then middleware then action', async () => {
    await program.parse('_ _'.split(' '))
    expect(output[0].name).toBe('default')
    expect(output[1].name).toBe('middleware')
    expect(output[2].name).toBe('action')
  })

  it('runs parent middlewares before descending to nested command', async () => {
    await program.parse('_ _ nested'.split(' '))
    expect(output[0].name).toBe('default')
    expect(output[1].name).toBe('middleware')
    expect(output[2].name).toBe('default')
    expect(output[3].name).toBe('nested middleware')
    expect(output[4].name).toBe('nested action')
  })

  it('passes parsed options to middlewares', async () => {
    await program.parse('_ _ test -r required nested -b'.split(' '))
    expect(output[0].name).toBe('default')
    expect(output[1].name).toBe('middleware')
    expect(output[2].name).toBe('default')
    expect(output[3].name).toBe('nested middleware')
    expect(output[4].name).toBe('nested action')
  })
})
