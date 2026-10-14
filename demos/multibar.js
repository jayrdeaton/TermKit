const { MultiBar, Bar } = require('../dist')

function delay(ms) { return new Promise(r => setTimeout(r, ms)) }

function fillBar(bar, durationMs) {
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    setTimeout(() => { bar.progress = i / steps }, (durationMs / steps) * i)
  }
}

;(async () => {
  // ─── indeterminate + determinate mix ────────────────────────────────────────
  console.log('Mixed indeterminate / determinate bars')
  await delay(200)

  const multi1 = new MultiBar()
  const spin   = multi1.add({ text: 'Connecting…', colors: Bar.COLORS.cool, mode: 'loop' })
  const dl     = multi1.add({ text: 'Downloading', progress: 0, colors: Bar.COLORS.blueRed })
  const build  = multi1.add({ text: 'Building',    progress: 0, colors: Bar.COLORS.heat })

  multi1.start()

  setTimeout(() => { spin.succeed('Connected') }, 1200)

  fillBar(dl, 3000)
  setTimeout(() => { dl.succeed('Download complete') }, 3200)

  setTimeout(() => { fillBar(build, 2500) }, 1500)
  setTimeout(() => { build.succeed('Build complete') }, 4200)

  await delay(4500)
  multi1.stop()
  console.log()

  // ─── parallel file processing with rate + ETA ────────────────────────────────
  console.log('Parallel tasks with rate / ETA tracking')
  await delay(200)

  const total = 120
  const multi2 = new MultiBar()
  const workers = ['worker-1', 'worker-2', 'worker-3'].map(name =>
    multi2.add({ text: name, progress: 0, colors: Bar.COLORS.rainbow, shimmer: 0.3 })
  )

  multi2.start()
  workers.forEach(w => w.track(total, { unit: 'files' }))

  const counts = workers.map(() => 0)
  const intervals = workers.map((w, i) => {
    const speed = 40 + i * 20 + Math.random() * 20
    return setInterval(() => {
      const batch = Math.floor(Math.random() * 4) + 1
      counts[i] = Math.min(counts[i] + batch, total)
      w.tick(batch)
      w.update(`worker-${i + 1}  ${counts[i]}/${total}`)
      if (counts[i] >= total) {
        clearInterval(intervals[i])
        w.succeed(`worker-${i + 1} done`)
      }
    }, speed)
  })

  await new Promise(resolve => {
    const check = setInterval(() => {
      if (workers.every(w => w._managedFinalLine !== null)) {
        clearInterval(check)
        resolve()
      }
    }, 100)
  })

  multi2.stop()
  console.log()

  // ─── deploy pipeline ─────────────────────────────────────────────────────────
  console.log('Sequential pipeline (each step starts after previous completes)')
  await delay(200)

  const multi3 = new MultiBar()
  const steps = [
    multi3.add({ text: 'Build',    progress: 0, colors: ['#6366f1', '#a78bfa'] }),
    multi3.add({ text: 'Test',     progress: 0, colors: ['#f59e0b', '#fbbf24'] }),
    multi3.add({ text: 'Package',  progress: 0, colors: ['#10b981', '#34d399'] }),
    multi3.add({ text: 'Deploy',   progress: 0, colors: ['#ef4444', '#f87171'] }),
  ]

  multi3.start()

  async function runStep(bar, label, duration) {
    fillBar(bar, duration)
    await delay(duration + 100)
    bar.succeed(label)
    await delay(200)
  }

  await runStep(steps[0], 'Build passed',   1800)
  await runStep(steps[1], 'Tests passed',   2200)
  await runStep(steps[2], 'Packaged',       1400)
  await runStep(steps[3], 'Deployed  ✓',    1600)

  multi3.stop()
  console.log()
})()
