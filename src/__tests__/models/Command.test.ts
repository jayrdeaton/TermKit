import { Command } from '../../models/Command'
import { Option } from '../../models/Option'

function parse(cmd: Command, args: string[]) {
  return cmd.parse(['_', '_', ...args])
}

describe('Command builder API', () => {
  it('description() sets info and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const result = cmd.description('My app')
    expect(cmd.info).toBe('My app')
    expect(result).toBe(cmd)
  })

  it('version() sets versionString and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const result = cmd.version('1.2.3')
    expect(cmd.versionString).toBe('1.2.3')
    expect(result).toBe(cmd)
  })

  it('variable() adds parsed variables and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const result = cmd.variable('<file>')
    expect(cmd.variables).toHaveLength(1)
    expect(cmd.variables![0].name).toBe('file')
    expect(result).toBe(cmd)
  })

  it('variable() appends to existing variables from the constructor', () => {
    const cmd = new Command({ name: 'app', variables: '<first>' })
    cmd.variable('<second>')
    expect(cmd.variables).toHaveLength(2)
    expect(cmd.variables![0].name).toBe('first')
    expect(cmd.variables![1].name).toBe('second')
  })

  it('action() sets actionFunction and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const fn = () => 'ok'
    const result = cmd.action(fn)
    expect(cmd.actionFunction).toBe(fn)
    expect(result).toBe(cmd)
  })

  it('command() pushes a subcommand and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const sub = new Command({ name: 'sub' })
    const result = cmd.command(sub)
    expect(cmd.commandsArray).toHaveLength(1)
    expect(cmd.commandsArray[0]).toBe(sub)
    expect(result).toBe(cmd)
  })

  it('commands() replaces commandsArray and registers command names', () => {
    const cmd = new Command({ name: 'app' })
    const a = new Command({ name: 'start' })
    const b = new Command({ name: 'stop' })
    cmd.commands([a, b])
    expect(cmd.commandsArray).toHaveLength(2)
    expect(cmd.commandStrings).toContain('start')
    expect(cmd.commandStrings).toContain('stop')
  })

  it('middleware() pushes a middleware and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const fn = async () => {}
    const result = cmd.middleware(fn)
    expect(cmd.middlewaresArray).toHaveLength(1)
    expect(cmd.middlewaresArray[0]).toBe(fn)
    expect(result).toBe(cmd)
  })

  it('middlewares() pushes multiple middlewares and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const fn1 = async () => {}
    const fn2 = async () => {}
    const result = cmd.middlewares([fn1, fn2])
    expect(cmd.middlewaresArray).toHaveLength(2)
    expect(result).toBe(cmd)
  })

  it('option() adds a new Option and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const result = cmd.option('v', 'verbose', null, 'Enable verbose')
    expect(cmd.optionsArray).toHaveLength(1)
    expect(cmd.optionsArray[0].short).toBe('v')
    expect(cmd.optionsArray[0].long).toBe('verbose')
    expect(result).toBe(cmd)
  })

  it('options() appends Option instances and is chainable', () => {
    const cmd = new Command({ name: 'app' })
    const opt = new Option({ short: 'q', long: 'quiet' })
    const result = cmd.options([opt])
    expect(cmd.optionsArray).toHaveLength(1)
    expect(cmd.optionsArray[0]).toBe(opt)
    expect(result).toBe(cmd)
  })

  it('constructor applies middlewares from CommandData', () => {
    const fn = async () => {}
    const cmd = new Command({ name: 'app', middlewares: [fn] })
    expect(cmd.middlewaresArray).toHaveLength(1)
    expect(cmd.middlewaresArray[0]).toBe(fn)
  })
})

describe('Command.parse — flags and options', () => {
  it('long flag with no variable resolves to true', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('v', 'verbose', null, 'Verbose').action((o) => o)
    const result = await parse(cmd, ['--verbose']) as any
    expect(result.verbose).toBe(true)
  })

  it('short flag with no variable resolves to true', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('v', 'verbose', null, 'Verbose').action((o) => o)
    const result = await parse(cmd, ['-v']) as any
    expect(result.verbose).toBe(true)
  })

  it('stacked short flags resolve independently', async () => {
    const cmd = new Command({ name: 'app' })
    cmd
      .option('a', 'alpha', null, 'Alpha')
      .option('b', 'beta', null, 'Beta')
      .action((o) => o)
    const result = await parse(cmd, ['-ab']) as any
    expect(result.alpha).toBe(true)
    expect(result.beta).toBe(true)
  })

  it('--no-flag negates a boolean option', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('v', 'verbose', null, 'Verbose').action((o) => o)
    const result = await parse(cmd, ['--verbose', '--no-verbose']) as any
    expect(result.verbose).toBe(false)
  })

  it('long option with value captures the value', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('p', 'port', '<port:number>', 'Port').action((o) => o)
    const result = await parse(cmd, ['--port', '3000']) as any
    expect(result.port).toBe(3000)
  })

  it('applies option defaults when option is absent', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('p', 'port', '<port:number=8080>', 'Port').action((o) => o)
    const result = await parse(cmd, []) as any
    expect(result.port).toBe(8080)
  })

  it('does not apply default when option is explicitly provided', async () => {
    const cmd = new Command({ name: 'app' })
    cmd.option('p', 'port', '<port:number=8080>', 'Port').action((o) => o)
    const result = await parse(cmd, ['--port', '9000']) as any
    expect(result.port).toBe(9000)
  })
})

describe('Command.parse — positional arguments', () => {
  it('captures a required positional variable', async () => {
    const cmd = new Command({ name: 'app', variables: '<name>' })
    cmd.action((o) => o)
    const result = await parse(cmd, ['world']) as any
    expect(result.name).toBe('world')
  })

  it('captures an optional positional variable', async () => {
    const cmd = new Command({ name: 'app', variables: '[dir]' })
    cmd.action((o) => o)
    const result = await parse(cmd, ['./out']) as any
    expect(result.dir).toBe('./out')
  })

  it('populates _ for arguments after --', async () => {
    const cmd = new Command({ name: 'app' }).action((o) => o)
    const result = await parse(cmd, ['--', 'a', 'b', 'c']) as any
    expect(result._).toEqual(['a', 'b', 'c'])
  })
})

describe('Command.parse — subcommands', () => {
  it('routes to a matching subcommand', async () => {
    const parent = new Command({ name: 'app' })
    const child = new Command({ name: 'start' })
    child.action(() => 'started')
    parent.command(child)
    const result = await parse(parent, ['start'])
    expect(result).toBe('started')
  })

  it('populates _parents when routing to a subcommand', async () => {
    const parent = new Command({ name: 'app' })
    parent.option('v', 'verbose', null, 'Verbose')
    const child = new Command({ name: 'sub' })
    child.action((o) => o)
    parent.command(child)
    const result = await parse(parent, ['--verbose', 'sub']) as any
    expect(result._parents?.app?.verbose).toBe(true)
  })

  it('throws SyntaxError on unknown subcommand', async () => {
    const cmd = new Command({ name: 'app' }).action((o) => o)
    await expect(parse(cmd, ['missing'])).rejects.toThrow('Unknown command: missing')
  })
})

describe('Command.parse — errors', () => {
  it('throws on unknown long option', async () => {
    const cmd = new Command({ name: 'app' }).action((o) => o)
    await expect(parse(cmd, ['--unknown'])).rejects.toThrow('Unknown Option: --unknown')
  })

  it('throws on unknown short option', async () => {
    const cmd = new Command({ name: 'app' }).action((o) => o)
    await expect(parse(cmd, ['-x'])).rejects.toThrow('Unknown Option: -x')
  })

  it('prints help when no action is defined', async () => {
    const cmd = new Command({ name: 'orphan' })
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    await expect(cmd.parse(['_', '_'])).resolves.toBeUndefined()
    const output = logSpy.mock.calls.map((c) => c.join(' ')).join('\n')
    expect(output).toContain('orphan')
    logSpy.mockRestore()
  })
})

describe('Command.parse — middleware', () => {
  it('runs middleware before the action', async () => {
    const order: string[] = []
    const cmd = new Command({ name: 'app' })
    cmd.middleware(async () => { order.push('mw') })
    cmd.action(() => { order.push('action'); return order })
    await parse(cmd, [])
    expect(order).toEqual(['mw', 'action'])
  })

  it('middleware receives parsed options', async () => {
    let received: unknown
    const cmd = new Command({ name: 'app' })
    cmd.option('v', 'verbose', null, 'Verbose')
    cmd.middleware(async (opts) => { received = opts })
    cmd.action((o) => o)
    await parse(cmd, ['--verbose'])
    expect((received as any).verbose).toBe(true)
  })
})
