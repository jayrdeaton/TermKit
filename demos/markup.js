const { markup, Color } = require('../dist')

// ─── Primitives ───────────────────────────────────────────────────────────────

console.log('Primitives\n')
console.log(markup('hello world'))
console.log(markup(42))
console.log(markup(9007199254740993n))
console.log(markup(true))
console.log(markup(null))
console.log(markup(undefined))
console.log(markup(Symbol('id')))
console.log(markup(new Date()))

// ─── Flat object ──────────────────────────────────────────────────────────────

console.log('\nFlat object\n')
console.log(markup({ name: 'alice', role: 'admin', active: true, score: 99 }))

// ─── Nested object ────────────────────────────────────────────────────────────

console.log('\nNested object\n')
console.log(markup({
  server: {
    host: 'localhost',
    port: 3000,
    tls: false,
  },
  tags: ['prod', 'v2', 'stable'],
  started: new Date(),
  error: null,
}))

// ─── Array ────────────────────────────────────────────────────────────────────

console.log('\nArray\n')
console.log(markup([
  { id: 1, name: 'Alice', active: true },
  { id: 2, name: 'Bob',   active: false },
  { id: 3, name: 'Carol', active: true },
]))

// ─── Custom styles ────────────────────────────────────────────────────────────

console.log('\nCustom styles\n')
console.log(markup(
  { count: 42, label: 'requests', ok: true, error: null },
  {
    styles: {
      number:  (v) => Color.hex('#f97316')(v),
      boolean: (v) => Color.hex('#a855f7')(v),
      string:  (v) => Color.hex('#06b6d4')(v),
    },
  }
))

// ─── Translations ─────────────────────────────────────────────────────────────

console.log('\nTranslations\n')
console.log(markup(
  { name: 'deploy-job', createdAt: '2024-01-15T10:30:00Z', updatedAt: '2024-06-01T08:00:00Z' },
  { translations: { createdAt: (v) => new Date(v), updatedAt: (v) => new Date(v) } }
))
