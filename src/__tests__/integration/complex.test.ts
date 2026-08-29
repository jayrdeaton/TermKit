import { Program } from '../..'

const { command, option } = Program

type ActionResult = { command: string; options: unknown }

let program: ReturnType<typeof command>

beforeAll(() => {
  program = command('app', '<req>')
    .version('1.0.0')
    .description('Program description')
    .variable('[dir]')
    .options([option('a', 'array', '[arr...]', 'Option with array variable'), option('r', 'required', '<reqA> <reqB>', 'Option with required variable'), option('o', 'optional', '[opt]', 'Option with optional variable'), option('b', 'boolean', null, 'Option with no variable')])
    .action((options) => ({ command: 'app', options }))
    .commands([
      command('help', undefined, 'Help Func').action((options) => ({ command: 'help', options })),
      command('one', '[reqA] [reqB]', 'Description of one')
        .option('a', 'array', '[arr...]', 'Option with array variable')
        .option('r', 'required', '<req>', 'Option with required variable')
        .option('o', 'optional', '[opt]', 'Option with optional variable')
        .option('b', 'boolean', null, 'Option with no variable')
        .action((options) => ({ command: 'one', options })),
      command('two', '<req>', 'Description of two')
        .option('a', 'array', '[arr...]', 'Option with array variable')
        .option('r', 'required', '<req>', 'Option with required variable')
        .option('o', 'optional', '[opt]', 'Option with optional variable')
        .option('b', 'boolean', null, 'Option with no variable')
        .action((options) => ({ command: 'two', options }))
        .commands([
          command('three', undefined, 'Description of three')
            .option('a', 'array', '[arr...]', 'Option with array variable')
            .option('r', 'required', '<req>', 'Option with required variable')
            .option('o', 'optional', '[opt]', 'Option with optional variable')
            .option('b', 'boolean', null, 'Option with no variable')
            .action((options) => ({ command: 'three', options }))
            .commands([command('help').action(() => undefined)]),
          command('four', '[optA] [optB]', 'Description of four')
            .option('a', 'array', '[arr...]', 'Option with array variable')
            .option(null, 'required', '<req>', 'Option with required variable')
            .option('o', null, '[opt]', 'Option with optional variable')
            .option('b', 'boolean', null, 'Option with no variable')
            .action((options) => ({ command: 'four', options }))
        ])
    ])
})

describe('parse base command', () => {
  it('runs app action with all option types', async () => {
    const result = (await program.parse('_ _ req --array arr0 arr1 arr2 --required req1 req2 --optional test --boolean'.split(' '))) as ActionResult
    expect(result.command).toBe('app')
  })

  it('parses boolean short flag with positional', async () => {
    const result = (await program.parse('_ _ -b req'.split(' '))) as ActionResult
    expect(result).toBeDefined()
    expect(result.command).toBe('app')
  })
})

describe('parse nested commands', () => {
  it('routes to command three with short flags', async () => {
    const result = (await program.parse('_ _ req two req three -a arr0 arr1 arr2 -r required -ob'.split(' '))) as ActionResult
    expect(result.command).toBe('three')
  })

  it('routes to command three with long flags', async () => {
    const result = (await program.parse('_ _ req two req three -a arr0 arr1 arr2 --required required -ob'.split(' '))) as ActionResult
    expect(result.command).toBe('three')
  })
})

describe('help', () => {
  it('routes to custom help command', async () => {
    const result = (await program.parse('_ _ help'.split(' '))) as ActionResult
    expect(result.command).toBe('help')
  })

  it('does not throw when help is triggered twice', async () => {
    await expect(program.parse('_ _ help'.split(' '))).resolves.not.toThrow()
  })
})
