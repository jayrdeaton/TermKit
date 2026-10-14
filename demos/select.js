const { Select, Spinner } = require('../dist')

const F = Spinner.FRAMES

;(async () => {
  const select = new Select()

  // ─── basic pick ──────────────────────────────────────────────────────────
  console.log('Basic pick')
  const framework = await select.ask('Which framework?', [
    { label: 'React' },
    { label: 'Vue' },
    { label: 'Svelte' },
    { label: 'Solid' },
  ])
  console.log(framework ? `  Picked: ${framework.label}` : '  Skipped')
  console.log()

  // ─── with descriptions ───────────────────────────────────────────────────
  console.log('With descriptions')
  const env = await select.ask('Deploy target?', [
    { label: 'Production',  description: 'live traffic, locked deploys' },
    { label: 'Staging',     description: 'mirrors prod, QA sign-off required' },
    { label: 'Development', description: 'free-for-all, breaks often' },
  ])
  console.log(env ? `  Picked: ${env.label}` : '  Skipped')
  console.log()

  // ─── custom colors ───────────────────────────────────────────────────────
  console.log('Custom colors (orange prompt / dim description)')
  const custom = new Select({ promptColor: '#f97316', descriptionColor: '#6b7280', skipLabel: 'None of these' })
  const lang = await custom.ask('Preferred language?', [
    { label: 'TypeScript', description: 'types all the way down' },
    { label: 'Go',         description: 'fast, boring (compliment)' },
    { label: 'Rust',       description: 'if you enjoy fighting the borrow checker' },
    { label: 'Python',     description: 'for when speed is someone else\'s problem' },
  ])
  console.log(lang ? `  Picked: ${lang.label}` : '  None chosen')
  console.log()

  // ─── search / filter ─────────────────────────────────────────────────────
  console.log('Search (type to filter)')
  const searchSelect = new Select({ search: true, skipLabel: 'Cancel' })
  const pkg = await searchSelect.ask('Pick a package:', [
    { label: 'express',    description: 'HTTP framework' },
    { label: 'fastify',    description: 'fast HTTP framework' },
    { label: 'koa',        description: 'minimalist web framework' },
    { label: 'hono',       description: 'edge-native HTTP framework' },
    { label: 'nest',       description: 'opinionated full-stack framework' },
    { label: 'elysia',     description: 'Bun-native framework' },
    { label: 'h3',         description: 'minimal server framework' },
    { label: 'polka',      description: 'micro web server' },
    { label: 'restify',    description: 'REST API framework' },
    { label: 'feathers',   description: 'real-time apps framework' },
  ])
  console.log(pkg ? `  Picked: ${pkg.label}` : '  Cancelled')
  console.log()

  // ─── scroll viewport ─────────────────────────────────────────────────────
  console.log('Scroll viewport (maxHeight: 5)')
  const scrollSelect = new Select({ maxHeight: 5 })
  const tz = await scrollSelect.ask('Timezone?', [
    { label: 'UTC' },
    { label: 'America/New_York' },
    { label: 'America/Chicago' },
    { label: 'America/Denver' },
    { label: 'America/Los_Angeles' },
    { label: 'Europe/London' },
    { label: 'Europe/Paris' },
    { label: 'Europe/Berlin' },
    { label: 'Asia/Tokyo' },
    { label: 'Asia/Shanghai' },
    { label: 'Asia/Kolkata' },
    { label: 'Australia/Sydney' },
  ])
  console.log(tz ? `  Picked: ${tz.label}` : '  Skipped')
  console.log()

  // ─── search + scroll combined ────────────────────────────────────────────
  console.log('Search + scroll (type to filter, maxHeight: 4)')
  const searchScroll = new Select({ search: true, maxHeight: 4, skipLabel: 'Skip' })
  const country = await searchScroll.ask('Country?', [
    { label: 'United States' }, { label: 'United Kingdom' }, { label: 'Canada' },
    { label: 'Australia' },     { label: 'Germany' },        { label: 'France' },
    { label: 'Japan' },         { label: 'South Korea' },    { label: 'Brazil' },
    { label: 'India' },         { label: 'Mexico' },         { label: 'Spain' },
    { label: 'Italy' },         { label: 'Netherlands' },    { label: 'Sweden' },
    { label: 'Norway' },        { label: 'Denmark' },        { label: 'Poland' },
    { label: 'Singapore' },     { label: 'New Zealand' },
  ])
  console.log(country ? `  Picked: ${country.label}` : '  Skipped')
  console.log()

  // ─── followed by a spinner ───────────────────────────────────────────────
  if (lang) {
    const spinner = new Spinner({ frames: F.braille, interval: 80, text: `Installing ${lang.label} toolchain…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 2000))
    spinner.stop()
    spinner.succeed(`${lang.label} ready`)
  }
})()
