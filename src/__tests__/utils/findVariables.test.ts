import { Variable } from '../../models/Variable'
import { findVariables } from '../../utils/findVariables'

describe('findVariables — no variable list', () => {
  it('returns { base: true } when base is provided and variables is null', async () => {
    expect(await findVariables('flag', [], null, [])).toEqual({ flag: true })
  })

  it('returns empty object when no base and no variables', async () => {
    expect(await findVariables(null, [], null, [])).toEqual({})
  })
})

describe('findVariables — single variable', () => {
  it('assigns the consumed value to base', async () => {
    const arr = ['file.txt']
    const v = new Variable({ name: 'file', type: 'string' })
    const result = await findVariables('output', arr, [v], [])
    expect(result).toEqual({ output: 'file.txt' })
  })

  it('assigns to variable name when base is null', async () => {
    const arr = ['file.txt']
    const v = new Variable({ name: 'file', type: 'string' })
    const result = await findVariables(null, arr, [v], [])
    expect(result).toEqual({ file: 'file.txt' })
  })

  it('returns { base: true } when optional variable is missing', async () => {
    const v = new Variable({ name: 'file', type: 'string' })
    const result = await findVariables('output', [], [v], [])
    expect(result).toEqual({ output: true })
  })
})

describe('findVariables — multiple variables', () => {
  it('nests values under base when there are multiple variables', async () => {
    const arr = ['a.txt', 'b.txt']
    const vars = [new Variable({ name: 'src', type: 'string' }), new Variable({ name: 'dest', type: 'string' })]
    const result = await findVariables('copy', arr, vars, [])
    expect(result).toEqual({ copy: { src: 'a.txt', dest: 'b.txt' } })
  })
})
