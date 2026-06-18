const { Program, Spinner, log } = require('../dist')

// ─── Command tree ─────────────────────────────────────────────────────────────

const prod = Program.command('prod', '<env>', 'Deploy to production')
  .option('t', 'tag', '<tag>', 'Docker image tag')
  .option('f', 'force', null, 'Skip confirmation')
  .action(async (options) => {
    const spinner = new Spinner({ text: `Deploying to ${options.env}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1600))
    spinner.succeed(`Deployed to ${options.env}${options.tag ? ` (tag: ${options.tag})` : ''}`)
  })

const staging = Program.command('staging', null, 'Deploy to staging')
  .action(async () => {
    const spinner = new Spinner({ text: 'Deploying to staging…' })
    spinner.start()
    await new Promise(r => setTimeout(r, 1000))
    spinner.succeed('Deployed to staging')
  })

const deploy = Program.command('deploy', null, 'Deploy the app')
  .commands([prod, staging])

const build = Program.command('build', '[target]', 'Build the project')
  .option('w', 'watch', null, 'Rebuild on file changes')
  .action(async (options) => {
    const target = options.target ?? 'all'
    const spinner = new Spinner({ text: `Building ${target}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1200))
    spinner.succeed(`Build complete — ${target}`)
    if (options.watch) log.info('Watching for changes…')
  })

const test = Program.command('test', '[suite]', 'Run the test suite')
  .option('c', 'coverage', null, 'Collect coverage report')
  .action(async (options) => {
    const suite = options.suite ?? 'all'
    const spinner = new Spinner({ text: `Running tests — ${suite}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1000))
    const passed = Math.floor(Math.random() * 40) + 60
    spinner.succeed(`${passed} tests passed`)
    if (options.coverage) log.info('Coverage report written to ./coverage')
  })

Program.command('myapp', null, 'A sample TermKit app')
  .commands([deploy, build, test])

// ─── Shell ────────────────────────────────────────────────────────────────────

const free = process.argv.includes('--free')

;(async () => {
  await Program.shell({
    mode: free ? 'free' : 'drill',
    promptColor: '#a855f7',
    banner: free
      ? 'myapp shell  (free mode — type full commands, "exit" to quit)'
      : 'myapp shell  (drill mode — navigate step by step, empty line at root to quit)',
  })
})()
