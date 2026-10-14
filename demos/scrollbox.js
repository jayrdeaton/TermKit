const { scrollbox, Scrollbox } = require('../dist')

const loremLines = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia.',
  'Deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus.',
  'Nulla gravida orci a odio, et tempus feugiat. Nullam varius turpis.',
  'Nunc commodo cursus magna, vel scelerisque nisl consectetur et.',
  'Donec sed odio dui. Maecenas faucibus mollis interdum.',
  'Vestibulum id ligula porta felis euismod semper.',
]

const logLines = Array.from({ length: 50 }, (_, i) => {
  const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
  const level = levels[i % levels.length]
  const pad = level === 'INFO' || level === 'WARN' ? ' ' : ''
  return `[${level}]${pad} 2024-01-${String((i % 28) + 1).padStart(2, '0')}: Event ${i + 1} processed successfully`
})

;(async () => {
  // ─── basic scrollbox ─────────────────────────────────────────────────────────
  console.log('Basic scrollbox (height 5)')
  await scrollbox(loremLines, { height: 5 })
  console.log()

  // ─── with title ──────────────────────────────────────────────────────────────
  console.log('With title')
  await scrollbox(loremLines, { height: 5, title: 'Lorem Ipsum' })
  console.log()

  // ─── line numbers ────────────────────────────────────────────────────────────
  console.log('Line numbers')
  await scrollbox(loremLines, { height: 5, title: 'Lorem Ipsum', lineNumbers: true })
  console.log()

  // ─── log viewer (50 lines) ───────────────────────────────────────────────────
  console.log('Log viewer (50 lines, height 10)')
  await scrollbox(logLines, { height: 10, title: 'Application Logs', lineNumbers: true })
  console.log()

  // ─── no scrollbar ────────────────────────────────────────────────────────────
  console.log('No scrollbar')
  await scrollbox(loremLines, { height: 5, scrollbar: false })
  console.log()

  // ─── custom border color ─────────────────────────────────────────────────────
  console.log('Custom border color')
  const box = new Scrollbox({ height: 5, title: 'Styled', borderColor: '#06b6d4' })
  await box.show(loremLines)
  console.log()

  // ─── word wrap ───────────────────────────────────────────────────────────────
  console.log('Word wrap')
  await scrollbox([
    'This is a very long line that will wrap when the terminal is not wide enough to display it all on one line.',
    'Short line.',
    'Another long line: the quick brown fox jumps over the lazy dog, and then keeps running into the sunset.',
  ], { height: 8, title: 'Wrapped', wrapLines: true })
  console.log()
})()
