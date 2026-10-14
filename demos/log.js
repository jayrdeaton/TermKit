const { Log, log, markup } = require('../dist')

// ─── Singleton log ────────────────────────────────────────────────────────────

console.log('Status methods\n')

log.succeed('Build complete')
log.fail('Connection refused')
log.warn('Rate limited, retrying')
log.info('Listening on port 3000')

// ─── data() ───────────────────────────────────────────────────────────────────

console.log('\nlog.data()\n')

log.data({ user: 'alice', role: 'admin', active: true, score: 42 })

console.log()

log.data({
  server: {
    host: 'localhost',
    port: 3000,
    tls: false,
  },
  tags: ['prod', 'v2'],
  started: new Date(),
  error: null,
})

// ─── Custom instance ──────────────────────────────────────────────────────────

console.log('\nCustom colors\n')

const purple = new Log({ successColor: '#a855f7' })
purple.succeed('Custom success color')

const orange = new Log({ warnColor: '#f97316', infoColor: '#06b6d4' })
orange.warn('Custom warn color')
orange.info('Custom info color')
