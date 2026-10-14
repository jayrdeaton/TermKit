const { Color } = require('../dist')

const line = () => console.log()

// ─── Named colors ─────────────────────────────────────────────────────────────

console.log('Named colors')
console.log(Color.black('black'))
console.log(Color.red('red'))
console.log(Color.green('green'))
console.log(Color.yellow('yellow'))
console.log(Color.blue('blue'))
console.log(Color.magenta('magenta'))
console.log(Color.cyan('cyan'))
console.log(Color.white('white'))
line()

// ─── Bright variants ──────────────────────────────────────────────────────────

console.log('Bright variants')
console.log(Color.bright.red('bright red'))
console.log(Color.bright.green('bright green'))
console.log(Color.bright.magenta('bright magenta'))
console.log(Color.bright.cyan('bright cyan'))
line()

// ─── Hex ──────────────────────────────────────────────────────────────────────

console.log('Hex')
console.log(Color.hex('#c026d3')('deep fuchsia'))
console.log(Color.hex('#e879f9')('light orchid'))
console.log(Color.hex('#f97316')('orange'))
console.log(Color.hex('#22c55e')('green'))
console.log(Color.hex('#3b82f6')('blue'))
line()

// ─── RGB ──────────────────────────────────────────────────────────────────────

console.log('RGB')
console.log(Color.rgb(192, 38, 211)('rgb magenta'))
console.log(Color.rgb(99, 102, 241)('rgb indigo'))
console.log(Color.rgb(234, 179, 8)('rgb amber'))
line()

// ─── xterm 256 ───────────────────────────────────────────────────────────────

console.log('xterm 256')
console.log(Color.xterm(129)('xterm 129: purple'))
console.log(Color.xterm(200)('xterm 200: hot pink'))
console.log(Color.xterm(214)('xterm 214: orange'))
line()

// ─── Style modifiers ─────────────────────────────────────────────────────────

console.log('Style modifiers')
console.log(Color.magenta.bold('bold'))
console.log(Color.magenta.italic('italic'))
console.log(Color.magenta.underline('underline'))
console.log(Color.magenta.faint('faint'))
console.log(Color.magenta.bold.italic('bold + italic'))
console.log(Color.hex('#c026d3').bold.underline('hex + bold + underline'))
line()

// ─── Backgrounds ─────────────────────────────────────────────────────────────

console.log('Backgrounds')
console.log(Color.background.magenta(' magenta bg '))
console.log(Color.background.hex('#c026d3')(' hex bg '))
console.log(Color.background.rgb(192, 38, 211)(' rgb bg '))
line()
