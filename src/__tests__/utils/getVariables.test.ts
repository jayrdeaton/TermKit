import { getVariables } from '../../utils/getVariables'

describe('getVariables - required variables', () => {
  it('parses a basic required variable', () => {
    const vars = getVariables('<file>')
    expect(vars).toHaveLength(1)
    expect(vars[0].name).toBe('file')
    expect(vars[0].required).toBe(true)
    expect(vars[0].type).toBe('string')
    expect(vars[0].raw).toBe('<file>')
  })
})

describe('getVariables - optional variables', () => {
  it('parses a basic optional variable', () => {
    const vars = getVariables('[dir]')
    expect(vars).toHaveLength(1)
    expect(vars[0].name).toBe('dir')
    expect(vars[0].required).toBe(false)
    expect(vars[0].raw).toBe('[dir]')
  })
})

describe('getVariables - array variables', () => {
  it('parses an array variable', () => {
    const vars = getVariables('[files...]')
    expect(vars).toHaveLength(1)
    expect(vars[0].name).toBe('files')
    expect(vars[0].array).toBe(true)
    expect(vars[0].required).toBe(false)
    expect(vars[0].raw).toBe('[files...]')
  })
})

describe('getVariables - typed variables', () => {
  it('parses number type', () => {
    const vars = getVariables('<port:number>')
    expect(vars[0].type).toBe('number')
    expect(vars[0].name).toBe('port')
  })

  it('parses integer type', () => {
    const vars = getVariables('<count:integer>')
    expect(vars[0].type).toBe('integer')
  })

  it('parses boolean type', () => {
    const vars = getVariables('<flag:boolean>')
    expect(vars[0].type).toBe('boolean')
  })

  it('defaults to string type when no type specified', () => {
    const vars = getVariables('<name>')
    expect(vars[0].type).toBe('string')
  })
})

describe('getVariables - enum variables', () => {
  it('parses enum from pipe-delimited values', () => {
    const vars = getVariables('<mode:dev|test|prod>')
    expect(vars[0].type).toBe('enum')
    expect(vars[0].enum).toEqual(['dev', 'test', 'prod'])
  })

  it('parses a two-option enum', () => {
    const vars = getVariables('<enabled:yes|no>')
    expect(vars[0].enum).toEqual(['yes', 'no'])
  })
})

describe('getVariables - range variables', () => {
  it('parses min and max from range syntax', () => {
    const vars = getVariables('<n:number(1,10)>')
    expect(vars[0].type).toBe('number')
    expect(vars[0].min).toBe(1)
    expect(vars[0].max).toBe(10)
  })

  it('parses negative min', () => {
    const vars = getVariables('<n:number(-10,10)>')
    expect(vars[0].min).toBe(-10)
    expect(vars[0].max).toBe(10)
  })

  it('parses integer range', () => {
    const vars = getVariables('<n:integer(0,100)>')
    expect(vars[0].type).toBe('integer')
    expect(vars[0].min).toBe(0)
    expect(vars[0].max).toBe(100)
  })
})

describe('getVariables - default values', () => {
  it('parses a typed default', () => {
    const vars = getVariables('<port:number=3000>')
    expect(vars[0].default).toBe('3000')
    expect(vars[0].type).toBe('number')
  })

  it('parses a string default', () => {
    const vars = getVariables('[dir:string=./out]')
    expect(vars[0].default).toBe('./out')
    expect(vars[0].required).toBe(false)
  })

  it('parses an enum with a default', () => {
    const vars = getVariables('[mode:dev|prod=dev]')
    expect(vars[0].type).toBe('enum')
    expect(vars[0].default).toBe('dev')
  })
})

describe('getVariables - multiple variables', () => {
  it('parses multiple space-separated variables', () => {
    const vars = getVariables('<first> <second> [third]')
    expect(vars).toHaveLength(3)
    expect(vars[0].name).toBe('first')
    expect(vars[0].required).toBe(true)
    expect(vars[1].name).toBe('second')
    expect(vars[1].required).toBe(true)
    expect(vars[2].name).toBe('third')
    expect(vars[2].required).toBe(false)
  })

  it('handles extra whitespace between variables', () => {
    const vars = getVariables('  <a>   <b>  ')
    expect(vars).toHaveLength(2)
  })
})

describe('getVariables - invalid format', () => {
  it('throws on an unrecognized variable format', () => {
    expect(() => getVariables('bare')).toThrow('Unrecognized variable description')
  })

  it('throws when a part has no angle or square brackets', () => {
    expect(() => getVariables('<ok> bad')).toThrow('Unrecognized variable description')
  })
})
