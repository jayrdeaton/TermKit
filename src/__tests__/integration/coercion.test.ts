import { Program } from '../..'

const { command } = Program

type ActionResult = { options: Record<string, unknown> }

describe('value coercion', () => {
  it('coerces a number option variable', async () => {
    const program = command('app')
      .option('p', 'port', '<port:number>', 'Port number')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --port 3000'.split(' '))) as ActionResult
    expect(result.options.port).toBe(3000)
    expect(typeof result.options.port).toBe('number')
  })

  it('coerces a boolean option variable', async () => {
    const program = command('app')
      .option('v', 'verbose', '[verbose:boolean]', 'Verbose mode')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --verbose true'.split(' '))) as ActionResult
    expect(result.options.verbose).toBe(true)

    const result2 = (await program.parse('_ _ --verbose false'.split(' '))) as ActionResult
    expect(result2.options.verbose).toBe(false)
  })

  it('coerces an array of numbers', async () => {
    const program = command('app')
      .option('n', 'nums', '[nums:number...]', 'Number list')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --nums 1 2 3'.split(' '))) as ActionResult
    expect(result.options.nums).toEqual([1, 2, 3])
  })

  it('leaves string variables uncoerced by default', async () => {
    const program = command('app')
      .option('n', 'name', '<name>', 'Name')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --name hello'.split(' '))) as ActionResult
    expect(result.options.name).toBe('hello')
    expect(typeof result.options.name).toBe('string')
  })

  it('coerces a required positional variable', async () => {
    const program = command('app', '<count:number>').action((options) => ({ options }))

    const result = (await program.parse('_ _ 42'.split(' '))) as ActionResult
    expect(result.options.count).toBe(42)
  })

  it('coerces an integer option variable', async () => {
    const program = command('app')
      .option('p', 'port', '<port:integer>', 'Port number')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --port 3000'.split(' '))) as ActionResult
    expect(result.options.port).toBe(3000)
    expect(Number.isInteger(result.options.port)).toBe(true)
  })

  it('throws on a float for an integer variable', async () => {
    const program = command('app')
      .option('p', 'port', '<port:integer>', 'Port number')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --port 3.14'.split(' '))).rejects.toThrow('Invalid value "3.14" — expected an integer')
  })

  it('accepts a valid enum value', async () => {
    const program = command('app')
      .option('e', 'env', '<env:dev|staging|prod>', 'Environment')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --env staging'.split(' '))) as ActionResult
    expect(result.options.env).toBe('staging')
  })

  it('throws on an invalid enum value', async () => {
    const program = command('app')
      .option('e', 'env', '<env:dev|staging|prod>', 'Environment')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --env nope'.split(' '))).rejects.toThrow('Invalid value "nope" — expected one of: dev, staging, prod')
  })

  it('returns a default value when option variable is omitted', async () => {
    const program = command('app')
      .option('p', 'port', '[port:integer=3000]', 'Port number')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _'.split(' '))) as ActionResult
    expect(result.options.port).toBe(3000)
  })

  it('overrides a default when a value is provided', async () => {
    const program = command('app')
      .option('p', 'port', '[port:integer=3000]', 'Port number')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --port 8080'.split(' '))) as ActionResult
    expect(result.options.port).toBe(8080)
  })

  it('returns a default enum value when omitted', async () => {
    const program = command('app')
      .option('e', 'env', '[env:dev|staging|prod=dev]', 'Environment')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _'.split(' '))) as ActionResult
    expect(result.options.env).toBe('dev')
  })

  it('accepts a valid enum positional variable', async () => {
    const program = command('app', '<mode:fast|slow>').action((options) => ({ options }))

    const result = (await program.parse('_ _ fast'.split(' '))) as ActionResult
    expect(result.options.mode).toBe('fast')
  })

  it('validates a number within range', async () => {
    const program = command('app')
      .option('p', 'port', '<port:integer(1,65535)>', 'Port')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --port 3000'.split(' '))) as ActionResult
    expect(result.options.port).toBe(3000)
  })

  it('throws when a number is below range', async () => {
    const program = command('app')
      .option('p', 'port', '<port:integer(1,65535)>', 'Port')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --port 0'.split(' '))).rejects.toThrow('must be >= 1')
  })

  it('throws when a number is above range', async () => {
    const program = command('app')
      .option('p', 'port', '<port:integer(1,65535)>', 'Port')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --port 99999'.split(' '))).rejects.toThrow('must be <= 65535')
  })
})

describe('string length constraints', () => {
  it('accepts a string within length bounds', async () => {
    const program = command('app')
      .option('n', 'name', '<name:string(3,20)>', 'Name')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --name hello'.split(' '))) as ActionResult
    expect(result.options.name).toBe('hello')
  })

  it('throws when string is too short', async () => {
    const program = command('app')
      .option('n', 'name', '<name:string(3,20)>', 'Name')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --name hi'.split(' '))).rejects.toThrow('at least 3 characters')
  })

  it('throws when string is too long', async () => {
    const program = command('app')
      .option('n', 'name', '<name:string(3,20)>', 'Name')
      .action((options) => ({ options }))

    await expect(program.parse('_ _ --name averylongnamethatexceedslimit'.split(' '))).rejects.toThrow('at most 20 characters')
  })
})

describe('--no-flag negation', () => {
  it('sets a boolean option to false via --no-xxx', async () => {
    const program = command('app')
      .option('v', 'verbose', null, 'Verbose mode')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --no-verbose'.split(' '))) as ActionResult
    expect(result.options.verbose).toBe(false)
  })
})

describe('-- passthrough', () => {
  it('collects everything after -- into options._', async () => {
    const program = command('app').action((options) => ({ options }))

    const result = (await program.parse('_ _ -- --foo bar baz'.split(' '))) as ActionResult
    expect(result.options._).toEqual(['--foo', 'bar', 'baz'])
  })

  it('still parses flags before --', async () => {
    const program = command('app')
      .option('v', 'verbose', null, 'Verbose')
      .action((options) => ({ options }))

    const result = (await program.parse('_ _ --verbose -- extra args'.split(' '))) as ActionResult
    expect(result.options.verbose).toBe(true)
    expect(result.options._).toEqual(['extra', 'args'])
  })
})
