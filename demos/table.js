const { Table } = require('../dist')

const users = [
  { name: 'Alice',   role: 'admin',   active: true,  score: 98 },
  { name: 'Bob',     role: 'editor',  active: false, score: 74 },
  { name: 'Carol',   role: 'viewer',  active: true,  score: 61 },
  { name: 'David',   role: 'editor',  active: true,  score: 87 },
  { name: 'Eve',     role: 'admin',   active: false, score: 55 },
]

// ─── Auto columns ─────────────────────────────────────────────────────────────

console.log('Auto columns\n')
new Table(users).print()

// ─── Column config ────────────────────────────────────────────────────────────

console.log('\nColumn config\n')
new Table(users, {
  title: 'User List',
  columns: [
    { key: 'name',   title: 'Name' },
    { key: 'role',   title: 'Role',   align: 'center' },
    { key: 'active', title: 'Active', align: 'center', value: (v) => (v ? '✔' : '✖') },
    { key: 'score',  title: 'Score',  align: 'right' },
  ],
  separator: '  ',
}).print()

// ─── String shorthand ─────────────────────────────────────────────────────────

console.log('\nString shorthand columns\n')
new Table(users, { columns: ['name', 'role'] }).print()

// ─── Alignment ────────────────────────────────────────────────────────────────

console.log('\nCenter aligned\n')
new Table(users, {
  align: Table.center,
  columns: ['name', 'role', 'score'],
}).print()

// ─── Meta rows ────────────────────────────────────────────────────────────────

console.log('\nWith meta row\n')

const total = users.reduce((sum, u) => sum + u.score, 0)
const avg   = Math.round(total / users.length)

new Table(users, {
  columns: [
    { key: 'name',  title: 'Name' },
    { key: 'role',  title: 'Role' },
    { key: 'score', title: 'Score', align: 'right' },
  ],
  meta: [{ name: 'Average', role: '', score: avg }],
}).print()
