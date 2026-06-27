const { Bar, Spinner, Color } = require('../dist')

const C = Bar.COLORS
const F = Spinner.FRAMES

function at(ms, fn) { setTimeout(fn, ms) }

// ─── Spinner ───────────────────────────────────────────────────────────

const spinnerConfigs = [
  { label: 'braille — plain',             opts: { frames: F.braille } },
  { label: 'braille — rainbow',           opts: { frames: F.braille, colors: C.rainbow } },
  { label: 'braille — rainbow cycling',   opts: { frames: F.braille, colors: C.rainbow, colorCycle: 1.0 } },
  { label: 'braille — heat + shimmer',    opts: { frames: F.braille, colors: C.heat, shimmer: 0.9 } },
  { label: 'dots — rainbow cycling',      opts: { frames: F.dots, colors: C.rainbow, colorCycle: 0.5 } },
  { label: 'line — plain',                opts: { frames: F.line } },
  { label: 'line — blue → red',           opts: { frames: F.line, colors: C.blueRed } },
  { label: 'arrow — rainbow + shimmer',   opts: { frames: F.arrow, colors: C.rainbow, colorCycle: 0.8, shimmer: 0.5 } },
  { label: 'bounce — sunset cycling',     opts: { frames: F.bounce, colors: C.sunset, colorCycle: 2.0 } },
]

const SPINNER_EACH = 3000

console.log('— Spinner —')

const spinner = new Spinner({ interval: 80 })

spinnerConfigs.forEach(({ label, opts }, i) => {
  at(i * SPINNER_EACH, () => {
    spinner.frames     = opts.frames     ?? F.braille
    spinner.colors     = opts.colors     ?? []
    spinner.colorCycle = opts.colorCycle ?? 0
    spinner.shimmer    = opts.shimmer    ?? 0
    spinner.text       = label
    if (i === 0) spinner.start()
  })
})

const TOTAL = spinnerConfigs.length * SPINNER_EACH

at(TOTAL, () => spinner.succeed('All frame styles'))

// ─── update() ─────────────────────────────────────────────────────────

const UPDATE_START = TOTAL + 1000

at(UPDATE_START - 500, () => { console.log(); console.log('— update() —') })

at(UPDATE_START, () => {
  const s = new Spinner('Starting…', { frames: F.braille, interval: 80 })
  s.start()
  setTimeout(() => s.update('Fetching data…'),    800)
  setTimeout(() => s.update('Processing…'),       1600)
  setTimeout(() => s.update('Almost done…'),      2400)
  setTimeout(() => { s.succeed('Finished') },     3200)
})

// ─── prefix() / suffix() ───────────────────────────────────────────────

const PREFIX_START = UPDATE_START + 4500

at(PREFIX_START - 500, () => { console.log(); console.log('— prefix() / suffix() —') })

at(PREFIX_START, () => {
  const total = 8
  let count = 0
  const s = new Spinner('files processed', { frames: F.braille, interval: 80 })
  s.prefix('0').start()
  const tick = setInterval(() => {
    s.prefix(String(++count))
    if (count >= total) {
      clearInterval(tick)
      setTimeout(() => s.succeed(`${total} files processed`), 400)
    }
  }, 400)
})

// ─── log() ────────────────────────────────────────────────────────────

const LOG_START = PREFIX_START + 5500

at(LOG_START - 500, () => { console.log(); console.log('— log() —') })

at(LOG_START, () => {
  const s = new Spinner('Deploying…', { frames: F.braille, interval: 80 })
  s.start()
  setTimeout(() => s.log('Building image'),                                      700)
  setTimeout(() => s.log('Pushed to registry', '→'),                            1400)
  setTimeout(() => s.log('Container started', Color.hex('#a855f7')('◆')),       2100)
  setTimeout(() => s.log('Health check passed', Color.hex('#22c55e')('✔')),     2800)
  setTimeout(() => s.log('No glyph line', ''),                                  3500)
  setTimeout(() => { s.succeed('Deployed') },                                   4200)
})

// ─── Status methods ────────────────────────────────────────────────────

const STATUS_START = LOG_START + 6000

at(STATUS_START - 500, () => { console.log(); console.log('— Status methods —') })

const statusExamples = [
  { method: 'succeed', message: 'Build complete' },
  { method: 'fail',    message: 'Connection refused' },
  { method: 'warn',    message: 'Rate limited, retrying' },
  { method: 'info',    message: 'Listening on port 3000' },
]

const statusSpinner = new Spinner('Working...', { frames: F.braille, interval: 80 })

at(STATUS_START, () => {
  const all = [
    ...statusExamples,
    { method: 'succeed', message: 'Custom color (purple)', spinner: new Spinner('Working...', { frames: F.braille, interval: 80, successColor: '#a855f7' }) },
  ]
  let i = 0
  function next() {
    if (i >= all.length) { process.stdout.write('\n'); return }
    const { method, message, spinner = statusSpinner } = all[i++]
    spinner.text = 'Working...'
    spinner.start()
    setTimeout(() => { spinner.stop(); spinner[method](message); next() }, 1200)
  }
  next()
})
