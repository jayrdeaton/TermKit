import { Command } from '../../models/Command'
import { findCommandVariables } from '../../utils/findCommandVariables'

describe('findCommandVariables', () => {
  it('returns null when the command has no variables', async () => {
    const cmd = new Command({ name: 'test' })
    expect(await findCommandVariables(['foo'], cmd)).toBeNull()
  })

  it('returns a result object when a variable is consumed', async () => {
    const cmd = new Command({ name: 'test', variables: '<file>' })
    const result = await findCommandVariables(['myfile.txt'], cmd)
    expect(result).toEqual({ file: 'myfile.txt' })
  })

  it('returns null when all variables are optional and none are provided', async () => {
    const cmd = new Command({ name: 'test', variables: '[file]' })
    const result = await findCommandVariables([], cmd)
    expect(result).toBeNull()
  })

  it('returns partial result when some optional variables are consumed', async () => {
    const cmd = new Command({ name: 'test', variables: '<src> [dest]' })
    const result = await findCommandVariables(['source.txt'], cmd)
    expect(result).not.toBeNull()
    expect(result!.src).toBe('source.txt')
    expect(result!.dest).toBeUndefined()
  })

  it('returns all variables when all are consumed', async () => {
    const cmd = new Command({ name: 'test', variables: '<src> <dest>' })
    const result = await findCommandVariables(['a.txt', 'b.txt'], cmd)
    expect(result).toEqual({ src: 'a.txt', dest: 'b.txt' })
  })

  it('leaves trailing tokens for required variables declared after an array', async () => {
    const cmd = new Command({ name: 'test', variables: '[files...] <dest>' })
    const array = ['a.txt', 'b.txt', 'out', '--force']
    const result = await findCommandVariables(array, cmd)
    expect(result).toEqual({ files: ['a.txt', 'b.txt'], dest: 'out' })
    expect(array).toEqual(['--force'])
  })

  it('lets the array come up empty when only the reserved tokens are present', async () => {
    const cmd = new Command({ name: 'test', variables: '[files...] <dest>' })
    const result = await findCommandVariables(['out'], cmd)
    expect(result).toEqual({ dest: 'out' })
  })

  it('still lets an array consume everything when only optional variables follow it', async () => {
    const cmd = new Command({ name: 'test', variables: '[files...] [dest]' })
    const result = await findCommandVariables(['a.txt', 'b.txt'], cmd)
    expect(result).toEqual({ files: ['a.txt', 'b.txt'] })
  })
})
