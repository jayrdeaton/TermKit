const { input, confirm, Spinner } = require('../dist')

;(async () => {
  console.log('Server Setup Wizard\n')

  const name = await input('Project name?', { minLength: 2, maxLength: 20, default: 'my-app' })

  const email = await input('Admin email?', {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    errorMessage: 'Must be a valid email address',
    errorColor: '#f97316',
  })

  const port = await input('Port?', { type: 'number', default: 3000, min: 1024, max: 65535 })

  const env = await input('Environment?', {
    type: 'enum',
    enum: ['development', 'staging', 'production'],
    default: 'development',
  })

  const https = await input('Enable HTTPS?', { type: 'boolean', default: false })

  let secret, confirmPass
  do {
    secret = await input('Admin password?', { mask: true, minLength: 8 })
    confirmPass = await input('Confirm password?', { mask: true })
    if (confirmPass !== secret) console.log('\n  Passwords do not match, try again\n')
  } while (confirmPass !== secret)

  console.log('\nInline\n')

  const host = await input('Host:', { inline: true, default: 'localhost' })
  const inlinePort = await input('Port:', { inline: true, type: 'number', default: 8080, min: 1, max: 65535 })
  const debug = await input('Debug?', { inline: true, type: 'boolean', default: false })

  console.log('\nconfirm() shorthand\n')

  const deploy = await confirm('Deploy to production?', { default: false })
  console.log(`  Answer: ${deploy}`)
  console.log()

  const spinner = new Spinner({ text: 'Generating config…' })
  spinner.start()
  await new Promise(r => setTimeout(r, 1400))
  spinner.stop()
  spinner.succeed('Config ready\n')

  console.log('  Project  ', name)
  console.log('  Email    ', email)
  console.log('  Port     ', port, `(${typeof port})`)
  console.log('  Env      ', env)
  console.log('  HTTPS    ', https, `(${typeof https})`)
  console.log('  Password ', '•'.repeat(secret.length))
  console.log('  Host     ', host)
  console.log('  Port     ', inlinePort)
  console.log('  Debug    ', debug)
})()
