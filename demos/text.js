const { truncate, wrap, Color } = require('../dist')

// ─── truncate ─────────────────────────────────────────────────────────────────

console.log('truncate\n')

const long = 'The quick brown fox jumps over the lazy dog near the riverbank'
console.log('  original   ', long)
console.log('  truncate20 ', truncate(long, 20))
console.log('  truncate40 ', truncate(long, 40))
console.log('  custom …   ', truncate(long, 30, ' [more]'))
console.log()

const colored = Color.green('Success: ') + 'all 42 tests passed in 1.2s'
console.log('  colored original   ', colored)
console.log('  colored truncate25 ', truncate(colored, 25))
console.log()

// ─── wrap ─────────────────────────────────────────────────────────────────────

console.log('wrap\n')

const para = 'This is a longer paragraph of text that would normally overflow a narrow terminal column and become difficult to read without proper word wrapping applied.'
console.log('  wrap(40):\n')
console.log(wrap(para, 40).split('\n').map(l => '    ' + l).join('\n'))
console.log()
console.log('  wrap(60):\n')
console.log(wrap(para, 60).split('\n').map(l => '    ' + l).join('\n'))
console.log()

const coloredPara = Color.cyan('INFO') + ' This line has some ANSI-colored tokens like ' + Color.yellow('warnings') + ' and ' + Color.red('errors') + ' mixed into otherwise plain prose that still needs to wrap correctly at a given column width.'
console.log('  wrap with ANSI (50):\n')
console.log(wrap(coloredPara, 50).split('\n').map(l => '    ' + l).join('\n'))
console.log()
