import { Command } from '../../models/Command'
import { findCommand } from '../../utils/findCommand'

describe('findCommand', () => {
  let start: Command
  let stop: Command
  let commands: Command[]

  beforeEach(() => {
    start = new Command({ name: 'start' })
    stop = new Command({ name: 'stop' })
    commands = [start, stop]
  })

  it('returns the matching command and shifts the array', () => {
    const arr = ['start', 'extra']
    expect(findCommand(arr, commands)).toBe(start)
    expect(arr).toEqual(['extra'])
  })

  it('returns null when no command matches', () => {
    const arr = ['unknown']
    expect(findCommand(arr, commands)).toBeNull()
    expect(arr).toEqual(['unknown'])
  })

  it('matches by exact command name', () => {
    const arr = ['stop']
    expect(findCommand(arr, commands)).toBe(stop)
  })

  it('does not shift the array on no match', () => {
    const arr = ['nope', 'other']
    findCommand(arr, commands)
    expect(arr).toHaveLength(2)
  })

  it('returns null for an empty commands list', () => {
    expect(findCommand(['start'], [])).toBeNull()
  })

  it('returns null for an empty array', () => {
    expect(findCommand([], commands)).toBeNull()
  })
})
