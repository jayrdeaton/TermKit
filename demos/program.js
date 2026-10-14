const { command, option, configure, Spinner, log } = require('../dist')

// ─── Program definition ───────────────────────────────────────────────────────

configure({ color: 'cyan' })

const deploy = command('deploy', '<env>', 'Deploy to a target environment')
  .option('t', 'tag', '<tag>', 'Docker image tag to deploy')
  .option('f', 'force', null, 'Skip confirmation prompts')
  .action(async (options) => {
    const spinner = new Spinner({ text: `Deploying to ${options.env}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1800))
    spinner.succeed(`Deployed to ${options.env}${options.tag ? ` (tag: ${options.tag})` : ''}`)
  })

const build = command('build', '[target]', 'Build the project')
  .option('w', 'watch', null, 'Rebuild on file changes')
  .option(null, 'config', '<path>', 'Path to build config file')
  .action(async (options) => {
    const target = options.target ?? 'all'
    const spinner = new Spinner({ text: `Building ${target}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1400))
    spinner.succeed(`Build complete: ${target}`)
    if (options.watch) log.info('Watching for changes…')
  })

const test = command('test', '[suite]', 'Run the test suite')
  .option('c', 'coverage', null, 'Collect coverage report')
  .option('w', 'watch', null, 'Re-run on file changes')
  .action(async (options) => {
    const suite = options.suite ?? 'all'
    const spinner = new Spinner({ text: `Running tests: ${suite}…` })
    spinner.start()
    await new Promise(r => setTimeout(r, 1200))
    const passed = Math.floor(Math.random() * 40) + 60
    spinner.succeed(`${passed} tests passed`)
    if (options.coverage) log.info('Coverage report written to ./coverage')
  })

const program = command('myapp', null, 'A sample TermKit CLI application')
  .version('1.0.0')
  .option('v', 'verbose', null, 'Enable verbose output')
  .option(null, 'env-file', '<path>', 'Path to .env file')
  .commands([deploy, build, test])
  .action(() => program.help())

// ─── Demo ─────────────────────────────────────────────────────────────────────

;(async () => {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    // Show help, then simulate a deploy run
    console.log('Help output\n')
    program.help()

    console.log('Simulated: myapp deploy staging --tag v1.2.3\n')
    await program.parse(['node', 'myapp', 'deploy', 'staging', '--tag', 'v1.2.3'])

    console.log('\nSimulated: myapp build --watch\n')
    await program.parse(['node', 'myapp', 'build', '--watch'])

    console.log('\nSimulated: myapp test --coverage\n')
    await program.parse(['node', 'myapp', 'test', '--coverage'])
  } else {
    await program.parse(['node', 'myapp', ...args])
  }
})()
