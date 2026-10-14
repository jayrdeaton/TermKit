const { Bar } = require('../dist')

const C = Bar.COLORS

function at(ms, fn) { setTimeout(fn, ms) }

function fill(start, duration, b) {
  const steps = 100
  for (let i = 0; i <= steps; i++) {
    at(start + (duration / steps) * i, () => {
      if (b.progress !== undefined) b.progress = i / steps
    })
  }
}

const bar = new Bar({ interval: 35 })
bar.start()
bar.update('bounce: plain')

at(3000, () => { bar.mode = 'loop';         bar.update('loop: plain') })
at(6000, () => { bar.mode = 'loop-reverse'; bar.update('loop-reverse: plain') })
at(9000, () => { bar.mode = 'bounce' })

at(9000, () => {
  bar.prefix = '|'
  bar.suffix  = '|'
  bar.update('bounce: pipe clamps')
})
at(12000, () => {
  bar.prefix = '«'
  bar.suffix  = '»'
  bar.update('bounce: guillemet clamps')
})
at(15000, () => {
  bar.prefix = '['
  bar.suffix  = ']'
})

at(15000, () => { bar.colors = C.blueRed;  bar.update('bounce: blue → red') })
at(18000, () => { bar.colors = C.rainbow;  bar.update('bounce: rainbow') })

at(21000, () => {
  bar.colorFill = true
  bar.shimmer   = 0.8
  bar.update('bounce: rainbow + shimmer + dim fill')
})
at(24000, () => {
  bar.shimmer   = 0
  bar.colorFill = false
  bar.bgColors  = ['#1a0000', '#00001a']
  bar.update('bounce: rainbow + dark bg track')
})

at(27000, () => {
  bar.bgColors   = []
  bar.colorCycle = 1.0
  bar.shimmer    = 0.6
  bar.colorFill  = true
  bar.mode       = 'loop'
  bar.update('loop: rainbow cycling + shimmer + fill')
})

let bounceCount = 0
at(30000, () => {
  bar.mode       = 'bounce'
  bar.colorCycle = 0
  bar.shimmer    = 0
  bar.colorFill  = false
  bar.colors     = C.blueRed
  bar.bgColors   = []
  bounceCount    = 0
  bar.onBounce   = () => { bounceCount++; bar.suffix = `] bounces: ${bounceCount}` }
  bar.update('bounce: onBounce callback (updates back label)')
})
at(33000, () => { bar.onBounce = undefined; bar.suffix = ']' })

at(33000, () => {
  bar.colors     = C.rainbow
  bar.shimmer    = 0.5
  bar.character  = '='
  bar.empty      = ' '
  bar.progress   = 0
  bar.onComplete = () => bar.update('complete!')
  bar.update('determinate: rainbow + shimmer')
})
fill(33200, 4500, bar)

at(38500, () => {
  bar.shimmer   = 0
  bar.colors    = C.heat
  bar.bgColors  = ['#05000a', '#000a05']
  bar.colorFill = true
  bar.progress  = 0
  bar.update('determinate: heat + fill + bg')
})
fill(38700, 4500, bar)

at(44000, () => { bar.stop(); bar.succeed('Bar done!') })

// ─── ETA / rate tracking ──────────────────────────────────────────────────────

setTimeout(() => {
  const total = 200
  const eta = new Bar('Processing…', { colors: Bar.COLORS.cool, progress: 0, character: '─' })
  eta.track(total, { showRate: true, showEta: true, unit: 'files' })
  eta.start()

  let done = 0
  const tick = setInterval(() => {
    const batch = Math.floor(Math.random() * 6) + 1
    done = Math.min(done + batch, total)
    eta.tick(batch)
    eta.update(`Processing… ${done}/${total}`)
    if (done >= total) {
      clearInterval(tick)
      eta.stop()
      eta.succeed(`Done: ${total} files processed`)
    }
  }, 80)
}, 45000)
