const { Chart, Color } = require('../dist')

// ─── Chart.Bar ────────────────────────────────────────────────────────────────

console.log('Chart.Bar basic -\n')
new Chart.Bar([
  { key: 'Mon', value: 42 },
  { key: 'Tue', value: 67 },
  { key: 'Wed', value: 31 },
  { key: 'Thu', value: 89 },
  { key: 'Fri', value: 54 },
]).print()

console.log('\nChart.Bar styled + gaps -\n')
new Chart.Bar([
  { key: 'Errors',   value: 12, style: (s) => Color.red(s) },
  { key: 'Warnings', value: 45, style: (s) => Color.yellow(s) },
  null,
  { key: 'OK',       value: 89, style: (s) => Color.green(s) },
]).print()

console.log('\nChart.Bar custom character -\n')
new Chart.Bar([
  { key: 'CPU', value: 72, character: '▪' },
  { key: 'RAM', value: 55, character: '▪' },
  { key: 'Disk', value: 38, character: '▪' },
]).print()

// ─── Chart.VerticalBar ─────────────────────────────────────────────────────────────

console.log('\nChart.VerticalBar basic -\n')
new Chart.VerticalBar([
  { key: 'M', value: 10 },
  { key: 'T', value: 25 },
  { key: 'W', value: 18 },
  { key: 'T', value: 30 },
  { key: 'F', value: 22 },
  { key: 'S', value: 8 },
  { key: 'S', value: 5 },
], { height: 8, colWidth: 3 }).print()

console.log('\nChart.VerticalBar styled + gaps -\n')
new Chart.VerticalBar([
  { key: 'Q1', value: 42, style: (s) => Color.blue(s) },
  { key: 'Q2', value: 67, style: (s) => Color.blue(s) },
  null,
  { key: 'Q3', value: 31, style: (s) => Color.magenta(s) },
  { key: 'Q4', value: 88, style: (s) => Color.magenta(s) },
], { height: 10, colWidth: 4 }).print()

// ─── Chart.Heatmap ────────────────────────────────────────────────────────────

console.log('\nChart.Heatmap basic -\n')
new Chart.Heatmap(
  [
    [1, 5, 9, 3, 7],
    [2, 6, 3, 8, 4],
    [8, 4, 7, 2, 9],
    [3, 9, 1, 6, 5],
  ],
  {
    rowLabels: ['Row A', 'Row B', 'Row C', 'Row D'],
    colLabels: ['C1', 'C2', 'C3', 'C4', 'C5'],
    colors: ['#0000ff', '#ff0000'],
  }
).print()

console.log('\nChart.Heatmap multi-stop scale -\n')
const data = Array.from({ length: 6 }, (_, r) =>
  Array.from({ length: 12 }, (_, c) => Math.round(Math.abs(Math.sin(r + c * 0.5) * 100)))
)
new Chart.Heatmap(data, {
  colors: ['#0000ff', '#00ffff', '#ffff00', '#ff0000'],
  cellWidth: 2,
}).print()

// ─── Chart.Scatter ────────────────────────────────────────────────────────────

console.log('\nChart.Scatter basic -\n')
new Chart.Scatter([
  { x: 1, y: 2 }, { x: 2, y: 5 }, { x: 3, y: 1 }, { x: 4, y: 8 },
  { x: 5, y: 4 }, { x: 6, y: 9 }, { x: 7, y: 3 }, { x: 8, y: 6 },
], { height: 12 }).print()

console.log('\nChart.Scatter multi-series -\n')
const seriesA = Array.from({ length: 20 }, (_, i) => ({ x: i, y: Math.sin(i * 0.5) * 5 }))
const seriesB = Array.from({ length: 20 }, (_, i) => ({ x: i, y: Math.cos(i * 0.5) * 5, character: '○', style: (s) => Color.cyan(s) }))
new Chart.Scatter([...seriesA, ...seriesB], { height: 14, yMin: -6, yMax: 6 }).print()

console.log('\nChart.Scatter no axes -\n')
new Chart.Scatter(
  Array.from({ length: 60 }, () => ({ x: Math.random() * 100, y: Math.random() * 100, style: (s) => Color.random(s) })),
  { height: 10, axes: false }
).print()

// ─── Chart.Line ───────────────────────────────────────────────────────────────

console.log('\nChart.Line sine wave -\n')
new Chart.Line(
  Array.from({ length: 40 }, (_, i) => ({ x: i, y: Math.sin(i * 0.3) * 4 })),
  { height: 12 }
).print()

console.log('\nChart.Line styled + fill -\n')
new Chart.Line(
  Array.from({ length: 30 }, (_, i) => ({ x: i, y: Math.pow(i * 0.15, 2), style: (s) => Color.cyan(s) })),
  { height: 10, fill: true }
).print()

console.log('\nChart.Line multiple series -\n')
new Chart.Line([
  ...Array.from({ length: 40 }, (_, i) => ({ x: i, y: Math.sin(i * 0.3) * 4, style: (s) => Color.magenta(s) })),
  ...Array.from({ length: 40 }, (_, i) => ({ x: i, y: Math.cos(i * 0.3) * 4, style: (s) => Color.yellow(s) })),
], { height: 14, yMin: -5, yMax: 5 }).print()

// ─── Chart.Sparkline ─────────────────────────────────────────────────────────

console.log('\nChart.Sparkline\n')

const cpuSamples = [12, 45, 23, 67, 89, 55, 34, 78, 61, 42, 95, 30, 48, 73, 58]
console.log('  CPU  ' + Chart.Sparkline(cpuSamples, { style: (s) => Color.green(s) }))

const memSamples = [55, 58, 60, 57, 62, 65, 63, 68, 70, 72, 71, 74, 76, 73, 78]
console.log('  MEM  ' + Chart.Sparkline(memSamples, { style: (s) => Color.blue(s) }))

const netSamples = [3, 1, 8, 24, 55, 42, 18, 6, 2, 11, 33, 47, 30, 14, 5]
console.log('  NET  ' + Chart.Sparkline(netSamples, { style: (s) => Color.yellow(s) }))
console.log()
