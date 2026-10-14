const { multiSelect, MultiSelect, Spinner } = require('../dist')

;(async () => {
  // ─── basic multi-pick ────────────────────────────────────────────────────────
  console.log('Basic multi-pick')
  const features = await multiSelect('Which features to enable?', [
    { label: 'Authentication' },
    { label: 'Rate limiting' },
    { label: 'Caching' },
    { label: 'Analytics' },
    { label: 'Webhooks' },
  ])
  console.log(features?.length ? `  Selected: ${features.map(f => f.label).join(', ')}` : '  None selected')
  console.log()

  // ─── with descriptions ───────────────────────────────────────────────────────
  console.log('With descriptions')
  const deps = await multiSelect('Add dependencies?', [
    { label: 'zod',    description: 'schema validation' },
    { label: 'axios',  description: 'HTTP client' },
    { label: 'dayjs',  description: 'date utilities' },
    { label: 'lodash', description: 'utility belt' },
  ])
  console.log(deps?.length ? `  Adding: ${deps.map(d => d.label).join(', ')}` : '  Skipped')
  console.log()

  // ─── min / max constraints ───────────────────────────────────────────────────
  console.log('Pick exactly 2 roles (min 2, max 2)')
  const roles = await multiSelect('Assign roles:', [
    { label: 'viewer' },
    { label: 'editor' },
    { label: 'admin' },
    { label: 'billing' },
  ], { min: 2, max: 2 })
  console.log(roles?.length ? `  Roles: ${roles.map(r => r.label).join(', ')}` : '  None')
  console.log()

  // ─── custom colors ───────────────────────────────────────────────────────────
  console.log('Custom colors')
  const custom = new MultiSelect({
    promptColor: '#f97316',
    colors: ['#f97316', '#facc15'],
    checkedPrefix: '★',
    uncheckedPrefix: '☆',
  })
  const langs = await custom.ask('Favourite languages?', [
    { label: 'TypeScript' },
    { label: 'Rust' },
    { label: 'Go' },
    { label: 'Python' },
  ])
  console.log(langs?.length ? `  Picked: ${langs.map(l => l.label).join(', ')}` : '  None')
  console.log()

  // ─── search / filter ─────────────────────────────────────────────────────────
  console.log('Search + multi-pick (type to filter)')
  const searched = await multiSelect('Select npm packages:', [
    { label: 'zod',       description: 'schema validation' },
    { label: 'valibot',   description: 'modular schema validation' },
    { label: 'yup',       description: 'object schema validation' },
    { label: 'axios',     description: 'HTTP client' },
    { label: 'ky',        description: 'tiny HTTP client' },
    { label: 'got',       description: 'human-friendly HTTP' },
    { label: 'dayjs',     description: 'date utilities' },
    { label: 'date-fns',  description: 'functional date helpers' },
    { label: 'luxon',     description: 'modern date library' },
    { label: 'lodash',    description: 'utility belt' },
    { label: 'ramda',     description: 'functional programming' },
    { label: 'immer',     description: 'immutable state helpers' },
  ], { search: true })
  console.log(searched?.length ? `  Selected: ${searched.map(p => p.label).join(', ')}` : '  None selected')
  console.log()

  // ─── scroll viewport ─────────────────────────────────────────────────────────
  console.log('Scroll viewport (maxHeight: 5)')
  const scrolled = await multiSelect('Pick regions to deploy to:', [
    { label: 'us-east-1',      description: 'N. Virginia' },
    { label: 'us-west-2',      description: 'Oregon' },
    { label: 'eu-west-1',      description: 'Ireland' },
    { label: 'eu-central-1',   description: 'Frankfurt' },
    { label: 'ap-southeast-1', description: 'Singapore' },
    { label: 'ap-northeast-1', description: 'Tokyo' },
    { label: 'ap-south-1',     description: 'Mumbai' },
    { label: 'sa-east-1',      description: 'São Paulo' },
    { label: 'ca-central-1',   description: 'Canada' },
    { label: 'af-south-1',     description: 'Cape Town' },
  ], { maxHeight: 5 })
  console.log(scrolled?.length ? `  Deploying to: ${scrolled.map(r => r.label).join(', ')}` : '  None selected')
  console.log()

  // ─── followed by a spinner ───────────────────────────────────────────────────
  if (deps?.length) {
    const spinner = new Spinner({ text: `Installing ${deps.map(d => d.label).join(', ')}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1500))
    spinner.stop()
    spinner.succeed(`${deps.length} package${deps.length > 1 ? 's' : ''} installed`)
  }
})()
