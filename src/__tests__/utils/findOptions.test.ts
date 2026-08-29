import { Command } from '../../models/Command'
import { Option } from '../../models/Option'
import { findOptions } from '../../utils/findOptions'

function makeCmd(opts: Option[]): Command {
  const cmd = new Command({ name: 'test' })
  cmd.optionsArray = opts
  return cmd
}

describe('findOptions — long flags', () => {
  it('parses a boolean long flag', async () => {
    const cmd = makeCmd([new Option({ long: 'verbose' })])
    const arr = ['--verbose']
    const result = await findOptions(arr, cmd)
    expect(result).toEqual({ verbose: true })
    expect(arr).toHaveLength(0)
  })

  it('parses a --no-<long> negation to false', async () => {
    const cmd = makeCmd([new Option({ long: 'verbose' })])
    const arr = ['--no-verbose']
    const result = await findOptions(arr, cmd)
    expect(result).toEqual({ verbose: false })
  })

  it('parses a long flag with a value', async () => {
    const cmd = makeCmd([new Option({ long: 'output', variables: '<file>' })])
    const arr = ['--output', 'out.txt']
    const result = await findOptions(arr, cmd)
    expect(result).toEqual({ output: 'out.txt' })
    expect(arr).toHaveLength(0)
  })

  it('throws on an unknown long flag', async () => {
    const cmd = makeCmd([])
    await expect(findOptions(['--unknown'], cmd)).rejects.toThrow('Unknown Option: --unknown')
  })

  it('appends the flag name to an inner error message', async () => {
    const cmd = makeCmd([new Option({ long: 'count', variables: '<n:integer>' })])
    await expect(findOptions(['--count', '3.5'], cmd)).rejects.toThrow('for --count')
  })
})

describe('findOptions — short flags', () => {
  it('parses a boolean short flag', async () => {
    const cmd = makeCmd([new Option({ short: 'v', long: 'verbose' })])
    const arr = ['-v']
    const result = await findOptions(arr, cmd)
    expect(result).toEqual({ verbose: true })
    expect(arr).toHaveLength(0)
  })

  it('throws on an unknown short flag', async () => {
    const cmd = makeCmd([])
    await expect(findOptions(['-x'], cmd)).rejects.toThrow('Unknown Option: -x')
  })

  it('stacks short flags: -vf pushes -f back for next iteration', async () => {
    const cmd = makeCmd([new Option({ short: 'v', long: 'verbose' }), new Option({ short: 'f', long: 'force' })])
    const arr = ['-vf']
    const result = await findOptions(arr, cmd)
    expect(result.verbose).toBe(true)
    expect(result.force).toBe(true)
  })
})

describe('findOptions — stops at non-flag tokens', () => {
  it('stops processing when the next token does not start with -', async () => {
    const cmd = makeCmd([new Option({ long: 'verbose' })])
    const arr = ['--verbose', 'file.txt']
    await findOptions(arr, cmd)
    expect(arr).toEqual(['file.txt'])
  })

  it('returns an empty object when there are no flags', async () => {
    const cmd = makeCmd([new Option({ long: 'verbose' })])
    expect(await findOptions(['file.txt'], cmd)).toEqual({})
  })
})

describe('findOptions — multiple flags', () => {
  it('collects multiple long flags', async () => {
    const cmd = makeCmd([new Option({ long: 'verbose' }), new Option({ long: 'force' })])
    const result = await findOptions(['--verbose', '--force'], cmd)
    expect(result).toEqual({ verbose: true, force: true })
  })
})
