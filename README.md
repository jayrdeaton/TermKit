# TermKit

TermKit is a complete terminal toolkit for Node.js. Build CLI programs with a fluent command API — nested subcommands, middleware, typed options — then prompt users interactively, render progress bars, tables, and charts, all from a single package with full TypeScript support.

## Installation

```bash
npm install termkit
```

## Usage

### Program

`Program` is the entry point for CLI argument parsing. Define commands with `Program.command`, declare options, attach middleware and actions, then call `Program.parse` to run.

```ts
import { Program } from 'termkit'

Program.command('my-app')
  .version('1.0.0')
  .description('My CLI application')
  .option('v', 'verbose', null, 'Enable verbose output')
  .option('o', 'output', '<file>', 'Output file path')
  .action((options) => {
    console.log(options.output)
  })

Program.parse(process.argv)
```

### Options

Options support four variable shapes:

```ts
Program.command('app')
  .option('b', 'boolean', null,        'Flag with no value')
  .option('o', 'optional', '[val]',    'Optional value')
  .option('r', 'required', '<val>',    'Required value')
  .option('a', 'array',    '[val...]', 'Array of values')
```

Accessible in actions and middleware via the long name:

```ts
.action((options) => {
  options.boolean  // true | undefined
  options.optional // string | true
  options.required // string
  options.array    // string[]
})
```

### Value coercion

Append `:number`, `:integer`, or `:boolean` to a variable to coerce the parsed string. Append `(min,max)` to enforce a numeric or length range. Use `|`-separated values for an enum:

```ts
Program.command('app')
  .option('p', 'port',  '<port:integer(1,65535)>', 'Port number')
  .option('e', 'env',   '<env:dev|staging|prod>',  'Environment')
  .option('n', 'nums',  '[nums:number...]',          'List of numbers')
  .option('t', 'token', '<token:string(32,64)>',    'API token')
  .action((options) => {
    options.port  // number
    options.env   // 'dev' | 'staging' | 'prod'
    options.nums  // number[]
    options.token // string
  })
```

Append `=default` inside the brackets to set a default value:

```ts
.option('p', 'port', '[port:integer=3000]', 'Port number')
```

### Subcommands

Commands nest to any depth. Each level can have its own options and middleware.

```ts
Program.command('app')
  .commands([
    Program.command('serve')
      .option('p', 'port', '<port:number>', 'Port to listen on')
      .action((options) => startServer(options.port)),

    Program.command('build')
      .option('w', 'watch', null, 'Watch for changes')
      .action((options) => runBuild(options)),
  ])
```

Commands can also carry their own positional variables:

```ts
Program.command('get', '<id>')        // required
Program.command('list', '[filter]')   // optional
Program.command('tag', '[tags...]')   // array
```

### Middleware

Middleware runs before the action. It can mutate the options object and supports async.

```ts
Program.command('app')
  .middleware(async (options) => {
    options.user = await getUser(options.token)
  })
  .action((options) => {
    console.log(options.user)
  })
```

Use `.middlewares([...])` to register several at once. When navigating into a subcommand, parent middleware runs first.

### Default middleware and options

Apply middleware or options to every command created after the call:

```ts
Program.setDefaults({
  middlewares: [
    async (options) => { options.timestamp = Date.now() }
  ]
})
```

### Built-in help

Passing `help` anywhere in argv prints a formatted usage table and stops execution:

```bash
my-app help
my-app serve help
```

Commands defined without an `.action()` print their help automatically when invoked. This makes parent commands that only group subcommands self-documenting — running `my-app` or `my-app serve` with no further input shows usage instead of erroring.

### Shell

Turn a command tree into an interactive REPL. `Program.shell()` runs the root command's subcommands as a live prompt instead of parsing `process.argv` once.

```ts
import { Program } from 'termkit'

// ...define commands with Program.command(...)

await Program.shell({ banner: 'myapp shell — type "help", "exit" to quit' })
```

Two modes:

- **`drill`** (default) — step through the tree one level at a time. Each prompt lists the available subcommands; type a name to descend, `..` to go back up, `help` to print usage, or an exit command to quit. Leaf commands prompt for each declared variable in turn, then run. An empty line at the root exits.
- **`free`** — type full command lines as you would on the CLI, with Tab completion across the command tree. `exit`/`quit` to leave.

```ts
await Program.shell({ mode: 'free', promptColor: '#a855f7' })
```

Options: `mode` (`'drill' | 'free'`, default `'drill'`), `prompt` (free-mode prompt label, defaults to the root command name), `promptColor` (named color, hex string, or xterm number), `banner`, `exitCommands` (default `['exit', 'quit']`), `historySize` (default `100`).

### configure

Sets global display options for the entire toolkit — accent color used in help output, tables, charts, and prompts; plus Unicode glyph support.

```ts
import { configure } from 'termkit'

configure({
  color: '#a855f7', // any named color, hex string, or xterm number
  glyphs: true,
})
```

`glyphs` is auto-detected at startup. TermKit disables Unicode glyphs and falls back to ASCII alternatives on legacy terminals: `TERM=dumb`, non-UTF-8 locales (`LANG`/`LC_ALL`), and Windows consoles that are not Windows Terminal, VS Code, or Hyper. Set `TERMKIT_ASCII=1` to force ASCII mode regardless of terminal detection.

### Input

Interactive text prompt. Supports string, number, integer, boolean, and enum types with validation.

```ts
import { input, confirm } from 'termkit'

const name = await input('Project name?', { default: 'my-app', minLength: 2, maxLength: 20 })
const port = await input('Port?', { type: 'number', default: 3000, min: 1024, max: 65535 })
const env  = await input('Environment?', { type: 'enum', enum: ['dev', 'staging', 'prod'] })
```

Use `confirm` as a shorthand for boolean prompts:

```ts
const deploy = await confirm('Deploy to production?', { default: false })
```

The text cursor supports left/right arrows, Home/End, Ctrl+A/E, and forward Delete for mid-string editing.

Options: `type`, `default`, `placeholder`, `mask`, `inline`, `required`, `min`, `max`, `minLength`, `maxLength`, `enum`, `match`, `regex`, `errorMessage`, `promptColor`, `promptGlyph`, `inputColor`, `errorColor`.

### Select

Single-item interactive picker. Navigate with ↑↓ or number keys, confirm with Enter.

```ts
import { select } from 'termkit'

const env = await select('Deploy target?', [
  { label: 'Production',  description: 'live traffic' },
  { label: 'Staging',     description: 'QA sign-off required' },
  { label: 'Development', description: 'free-for-all' },
])
```

Pass `search: true` to add a type-to-filter input. Typing narrows the list; Backspace removes the last character. Number shortcuts are disabled in search mode — use ↑↓.

```ts
const pkg = await select('Pick a package:', packages, { search: true })
```

Pass `maxHeight` to cap the visible rows and enable scrolling. The viewport follows the cursor automatically. Even without `maxHeight`, the list is clamped to the terminal height so a long list never scrolls the screen.

```ts
const tz = await select('Timezone?', timezones, { maxHeight: 8 })
```

Both options compose freely:

```ts
const country = await select('Country?', countries, { search: true, maxHeight: 6 })
```

Options: `colors`, `colorCycle`, `shimmer`, `skipLabel`, `promptColor`, `promptGlyph`, `descriptionColor`, `selectedPrefix`, `selectedSuffix`, `interval`, `search`, `maxHeight`.

### MultiSelect

Multi-item interactive picker. Returns an array of the selected items.

```ts
import { multiSelect } from 'termkit'

const features = await multiSelect('Enable features?', [
  { label: 'Authentication' },
  { label: 'Rate limiting' },
  { label: 'Caching',     description: 'Redis-backed' },
  { label: 'Webhooks' },
])
```

Keyboard controls: ↑↓ navigate · Space/Tab toggle · → select · ← deselect · `a` select all · Enter confirm.

Enforce selection counts with `min` and `max`:

```ts
const roles = await multiSelect('Assign roles:', items, { min: 1, max: 3 })
```

Pass `search: true` to add a type-to-filter input. All printable characters go to the query; `a` select-all is disabled in search mode. Checked items are tracked by their position in the original list so toggling survives filtering.

```ts
const pkgs = await multiSelect('Add dependencies:', packages, { search: true })
```

Pass `maxHeight` to cap the visible rows with auto-scrolling. As with `select`, the list is also clamped to the terminal height automatically so it never scrolls the screen.

```ts
const regions = await multiSelect('Deploy to:', regions, { maxHeight: 6 })
```

Options: `min`, `max`, `allowSkip`, `colors`, `colorCycle`, `shimmer`, `checkedPrefix`, `uncheckedPrefix`, `promptColor`, `promptGlyph`, `descriptionColor`, `errorColor`, `interval`, `search`, `maxHeight`.

### Log

`log` is a singleton logger. `Log` is the class for custom instances.

```ts
import { log } from 'termkit'

log.succeed('Build complete')
log.fail('Connection refused')
log.warn('Rate limited, retrying')
log.info('Listening on port 3000')
log.data({ user: 'alice', role: 'admin', active: true })
```

Custom instance with colors:

```ts
import { Log } from 'termkit'

const logger = new Log({ successColor: '#a855f7', failColor: '#ef4444' })
logger.succeed('Custom color')
```

### markup

Pretty-prints any value with syntax coloring — strings, numbers, booleans, `null`, `Date`, nested objects, and arrays.

```ts
import { markup } from 'termkit'

console.log(markup({ name: 'alice', roles: ['admin', 'editor'], active: true }))
```

Custom styles and value translations:

```ts
import { markup, Color } from 'termkit'

const out = markup(data, {
  styles: {
    number:  (v) => Color.hex('#f97316')(v),
    boolean: (v) => Color.hex('#a855f7')(v),
  },
  translations: {
    createdAt: (v) => new Date(v as string),
  },
})
console.log(out)
```

### Table

Renders tabular data with auto-sized columns, optional titles, alignment, and meta rows.

```ts
import { Table } from 'termkit'

const rows = [
  { name: 'Alice', role: 'admin',  active: true },
  { name: 'Bob',   role: 'editor', active: false },
]

new Table(rows).print()
```

Column configuration — pass a `columns` array to control ordering, titles, alignment, and value formatting:

```ts
new Table(rows, {
  title: 'Users',
  columns: [
    { key: 'name',   title: 'Name' },
    { key: 'role',   title: 'Role', align: 'center' },
    { key: 'active', title: 'Active', value: (v) => (v ? 'yes' : 'no'), align: 'right' },
  ],
  separator: '  ',
}).print()
```

Global alignment, margin, and meta rows (rendered below a separator after the data rows):

```ts
new Table(rows, {
  align: Table.center,   // Table.left | Table.center | Table.right
  margin: 1,             // extra space added to each column's padding
  meta: [{ name: 'Total', role: '', active: '' }],
}).print()
```

Passing a string shorthand instead of a `ColumnOptions` object uses the key as both key and title:

```ts
new Table(rows, { columns: ['name', 'role'] }).print()
```

### Chart

The `Chart` namespace provides horizontal bar, vertical column, heatmap, scatter, line, and sparkline visualizations. Every chart class has a `.print()` method that writes to stdout and a `.toString()` method that returns the rendered string.

All chart constructors accept optional `paddingX` and `paddingY` options to add whitespace around the output.

#### Chart.Bar

Horizontal bar chart. Each item maps a label to a value; the bar width scales to fill the terminal.

```ts
import { Chart } from 'termkit'

new Chart.Bar([
  { key: 'Mon', value: 42 },
  { key: 'Tue', value: 67 },
  { key: 'Wed', value: 31 },
]).print()
```

Custom style and `null` gaps (blank rows):

```ts
import { Chart, Color } from 'termkit'

new Chart.Bar([
  { key: 'Errors',   value: 12, style: Color.red },
  { key: 'Warnings', value: 45, style: Color.yellow },
  null,
  { key: 'OK',       value: 89, style: Color.green },
]).print()
```

Pass `character` to use a custom fill character instead of a solid block:

```ts
new Chart.Bar([
  { key: 'CPU', value: 72, character: '▪' },
  { key: 'RAM', value: 55, character: '▪' },
]).print()
```

Pass `width` to override the terminal column width used for scaling:

```ts
new Chart.Bar(data, { width: 60, paddingX: 2, paddingY: 1 }).print()
```

#### Chart.VerticalBar

Vertical column chart using Unicode block characters with fractional height resolution.

```ts
new Chart.VerticalBar([
  { key: 'M', value: 10 },
  { key: 'T', value: 25 },
  { key: 'W', value: 18 },
  { key: 'T', value: 30 },
  { key: 'F', value: 22 },
], { height: 8, colWidth: 3 }).print()
```

Pass `null` items to insert gaps between column groups:

```ts
new Chart.VerticalBar([
  { key: 'A', value: 15, style: Color.blue },
  { key: 'B', value: 28, style: Color.blue },
  null,
  { key: 'C', value: 10, style: Color.magenta },
], { height: 10 }).print()
```

Pass `width` to have `colWidth` auto-calculated to fill a fixed total width:

```ts
new Chart.VerticalBar(data, { width: 40, height: 12 }).print()
```

#### Chart.Heatmap

2-D grid colored by value intensity between a configurable low and high color.

```ts
new Chart.Heatmap(
  [
    [1, 5, 9, 3],
    [2, 6, 3, 8],
    [8, 4, 7, 2],
  ],
  {
    rowLabels: ['Row A', 'Row B', 'Row C'],
    colLabels: ['C1', 'C2', 'C3', 'C4'],
    colors: ['#0000ff', '#ff0000'],
  }
).print()
```

Multi-stop color scale and explicit range:

```ts
new Chart.Heatmap(data, {
  colors: ['#0000ff', '#00ffff', '#ffff00', '#ff0000'],
  min: 0,
  max: 100,
  cellWidth: 3,
}).print()
```

#### Chart.Scatter

2-D scatter plot with optional labeled axes. Points outside the plot bounds are silently clipped.

```ts
new Chart.Scatter([
  { x: 1, y: 2 },
  { x: 3, y: 5 },
  { x: 7, y: 3 },
]).print()
```

Custom characters, per-point styles, and explicit axis bounds:

```ts
import { Chart, Color } from 'termkit'

new Chart.Scatter([
  { x: 10, y: 20, character: '●', style: Color.green },
  { x: 30, y: 50, character: '●', style: Color.red },
], {
  width: 60,
  height: 20,
  xMin: 0,
  xMax: 40,
  yMin: 0,
  yMax: 60,
}).print()
```

Disable axes for a raw grid output:

```ts
new Chart.Scatter(data, { axes: false }).print()
```

#### Chart.Line

Line chart that interpolates between data points. Accepts the same axis options as `Chart.Scatter`.

```ts
import { Chart } from 'termkit'

new Chart.Line(
  Array.from({ length: 40 }, (_, i) => ({ x: i, y: Math.sin(i * 0.3) * 4 })),
  { height: 12 }
).print()
```

Per-point styles and optional fill below the line:

```ts
import { Chart, Color } from 'termkit'

new Chart.Line(data, { fill: true, style: (s) => Color.cyan(s) }).print()
```

Options: `width`, `height`, `xMin`, `xMax`, `yMin`, `yMax`, `character`, `axes`, `fill`, `paddingX`, `paddingY`.

#### Chart.Sparkline

Returns a single-line sparkline string using Unicode block characters. Useful for inline metrics.

```ts
import { Chart, Color } from 'termkit'

const samples = [12, 45, 23, 67, 89, 55, 34, 78, 61]
console.log('CPU  ' + Chart.Sparkline(samples, { style: (s) => Color.green(s) }))
// CPU  ▁▃▁▅█▄▂▆▄
```

Options: `min`, `max`, `style`.

### Bar

Animated progress bar. Pass text as the first argument and options second:

```ts
import { Bar } from 'termkit'

const bar = new Bar('Processing…', { progress: 0 })
bar.start()
```

Update the inline label while running:

```ts
bar.update('Uploading assets…')
```

Write a persistent log line while the bar keeps running. The default glyph is a faint `·`; pass any string — plain or pre-colored — as the second argument to override it:

```ts
bar.log('Processed batch 3')
bar.log('Skipped 4 files', '→')
bar.log('Error on item 12', Color.hex('#ef4444')('✖'))
bar.log('No glyph line', '')
```

#### ETA and rate tracking

Attach progress tracking with `.track()` and `.tick()`:

```ts
const total = 500
const bar = new Bar('Processing…', { progress: 0 })
bar.track(total, { showRate: true, showEta: true, unit: 'files' })
bar.start()

for await (const item of items) {
  await process(item)
  bar.tick()
}

bar.succeed(`Done — ${total} files processed`)
```

Each `tick(n?)` increments the completed count, updates `progress`, and appends a live `12.3/s · ETA 8s` suffix that shrinks the bar to keep the full line within terminal width.

Raw values are available as getters at any time:

```ts
bar.rate  // units per second (number)
bar.eta   // estimated seconds remaining (number)
```

Options on `track(total, opts?)`: `unit` (label appended to rate), `showRate` (default `true`), `showEta` (default `true`). Both can also be set via constructor options: `new Bar('Uploading…', { showRate: true, showEta: true, rateUnit: 'MB' })`.

#### Bar.current

`Bar.current` follows the same pattern as `Spinner.current` — set on `.start()`, cleared on any terminal method. Use it to reach the active bar from deep in processing loops or error handlers:

```ts
const bar = new Bar('Processing…', { progress: 0 })
bar.track(total)
bar.start()

// from a utility function
Bar.current?.update('Flushing cache…')

// in a catch block
Bar.current?.fail(`Failed: ${err.message}`)
```

### MultiBar

Renders multiple `Bar` instances as a synchronized block. Each bar animates independently; calling `.succeed()`, `.fail()`, `.warn()`, or `.info()` on a bar freezes that line while the others keep running. The group stops automatically when every bar is finalized.

```ts
import { MultiBar, Bar } from 'termkit'

const multi = new MultiBar()
const download = multi.add({ text: 'Downloading', progress: 0, colors: Bar.COLORS.cool })
const build    = multi.add({ text: 'Building',    progress: 0, colors: Bar.COLORS.heat })
const deploy   = multi.add({ text: 'Deploying' })  // indeterminate until started

multi.start()

await runDownload(p => { download.progress = p })
download.succeed('Downloaded')

await runBuild(p => { build.progress = p })
build.succeed('Built')

deploy.progress = 0
await runDeploy(p => { deploy.progress = p })
deploy.succeed('Deployed')

multi.stop()
```

Each `add()` call accepts the same options as `Bar` and returns a `Bar` instance — `.update()`, `.tick()`, `.track()`, `.progress`, and the completion methods all work the same way. Bars must be added before `.start()`.

Options: `interval`.

### Spinner

Animated spinner for indeterminate work. Shares the same completion API as `Bar` — `.succeed()`, `.fail()`, `.warn()`, `.info()`.

```ts
import { Spinner } from 'termkit'

const spinner = new Spinner('Loading…')
spinner.start()

await doWork()

spinner.succeed('Done')
```

Pass options as the second argument:

```ts
const spinner = new Spinner('Thinking…', { frames: Spinner.FRAMES.dots, interval: 60 })
```

Update the inline label while running:

```ts
spinner.update('Still working…')
```

Use `prefix` and `suffix` to bookend the text independently of the spinner frame, which always stays at the far left. Spaces between the parts are automatic:

```ts
// renders: ⠋ 0 files copied
const spinner = new Spinner('files copied')
spinner.start()
spinner.prefix(String(count))   // ⠋ 42 files copied
spinner.suffix('(estimating…)') // ⠋ 42 files copied (estimating…)
```

All three — `update()`, `prefix()`, and `suffix()` — are chainable and can be called while the spinner is running.

Write a persistent log line while the spinner keeps running. The default glyph is a faint `·`; pass any string — plain or pre-colored — as the second argument to override it:

```ts
spinner.log('Fetched 42 items')
spinner.log('Fetched 42 items', '→')
spinner.log('Fetched 42 items', Color.hex('#00ff00')('✔'))
spinner.log('Fetched 42 items', '')  // no glyph
```

The completion methods accept a custom glyph color via `successColor`, `failColor`, `warnColor`, and `infoColor` — the glyph is colored, the message text is left unstyled:

```ts
const spinner = new Spinner('Deploying…', { successColor: '#a855f7', failColor: '#ef4444' })
spinner.succeed('Build complete')   // purple ✔
spinner.fail('Connection refused')  // red ✖
```

#### Spinner.current

`Spinner.current` is automatically set to whichever spinner called `.start()` most recently, and cleared when it terminates. Use it to reach the active spinner from helpers, error handlers, or signal listeners without passing the instance around:

```ts
// top-level handler
const spinner = new Spinner('Deploying…')
spinner.start()

// anywhere else in your app
Spinner.current?.update('Uploading assets…')

// in a catch block
Spinner.current?.fail(`Deploy failed: ${err.message}`)

// in a SIGTERM handler — ?. is intentional: a spinner may not be running
process.on('SIGTERM', () => Spinner.current?.stop('Interrupted'))
```

Built-in frame sets are available on `Spinner.FRAMES`:

```ts
new Spinner('Thinking…', { frames: Spinner.FRAMES.dots }).start()
```

Frame sets: `braille`, `dots`, `line`, `arrow`, `bounce`.

Options: `frames`, `prefix`, `suffix`, `reverse`, `interval`, `colors`, `bgColors`, `colorCycle`, `shimmer`, `successColor`, `failColor`, `warnColor`, `infoColor`, `glyphs`.

### Scrollbox

Interactive terminal pager. Renders a fixed-height viewport over an array of strings with keyboard navigation. Requires an interactive TTY.

```ts
import { scrollbox } from 'termkit'

await scrollbox(lines, { height: 20, title: 'Output', lineNumbers: true })
```

Or use the class directly for more control:

```ts
import { Scrollbox } from 'termkit'

const box = new Scrollbox({ height: 15, scrollbar: true, wrapLines: true })
await box.show(lines)
```

Keyboard controls: ↑↓ / `j` `k` scroll one line · `d` / `u` half-page · `f` / `b` full page · `g` top · `G` bottom · Enter / Escape / `q` close.

Options: `height`, `title`, `lineNumbers`, `scrollbar`, `borderColor`, `wrapLines`.

### truncate

ANSI-aware string truncation. Measures visible length ignoring escape codes, and appends a configurable suffix.

```ts
import { truncate } from 'termkit'

truncate('The quick brown fox jumps over the lazy dog', 20)
// 'The quick brown fox…'  (or '...' on legacy terminals)

truncate(coloredString, 40, ' [more]')
```

The default suffix is `…` when glyphs are enabled and `...` on legacy terminals. Pass an explicit suffix to override.

### wrap

ANSI-aware word wrap. Breaks at spaces to keep each line within a given column width.

```ts
import { wrap } from 'termkit'

console.log(wrap(longParagraph, 60))
```

## API

### Program

| Method | Signature | Description |
|---|---|---|
| `Program.command` | `(name, variables?, info?) => Command` | Create a command |
| `Program.option` | `(short, long, variables, info) => Option` | Create a standalone option |
| `Program.middleware` | `(fn) => fn` | Identity helper for typing middleware inline |
| `Program.parse` | `(argv) => Promise<void>` | Parse argv using the root command |
| `Program.setDefaults` | `(defaults) => void` | Apply middleware/options to all new commands |
| `Program.shell` | `(options?) => Promise<void>` | Run the command tree as an interactive REPL |

### Functions

| Function | Signature | Description |
|---|---|---|
| `configure` | `(opts) => void` | Set global accent color and display options |
| `scrollbox` | `(lines, options?) => Promise<void>` | Interactive terminal pager |
| `markup` | `(data, options?) => string` | Pretty-print a value with syntax coloring |
| `input` | `(prompt, options?) => Promise<string \| number \| boolean \| null>` | Interactive text prompt |
| `confirm` | `(prompt, options?) => Promise<boolean \| null>` | Boolean yes/no prompt |
| `select` | `(prompt, items, options?) => Promise<T \| null>` | Single-item interactive picker |
| `multiSelect` | `(prompt, items, options?) => Promise<T[] \| null>` | Multi-item interactive picker |
| `Chart.Sparkline` | `(data, options?) => string` | Single-line sparkline string |
| `truncate` | `(s, maxLength, suffix?) => string` | ANSI-aware string truncation |
| `wrap` | `(s, width) => string` | ANSI-aware word wrap |
| `padLeft` | `(s, width) => string` | Right-align a string within a fixed width |
| `padRight` | `(s, width) => string` | Left-align a string within a fixed width |
| `padSides` | `(s, width) => string` | Center a string within a fixed width |
| `stringLength` | `(s) => number` | Visual length of a string, stripping ANSI escape codes |

### Classes

`Command`, `Option`, `Variable`, `TermKit`, `Shell`, `Bar`, `MultiBar`, `Spinner`, `Scrollbox`, `Input`, `Select`, `MultiSelect`, `Log`, `Table`, `Column`, `Chart.Bar`, `Chart.VerticalBar`, `Chart.Heatmap`, `Chart.Scatter`, `Chart.Line`

### Types

`ActionFn`, `MiddlewareFn`, `ParsedOptions`, `CommandDefaults`, `ShellOptions`, `VariableType`, `BarMode`, `BarOptions`, `MultiBarOptions`, `SpinnerOptions`, `InputOptions`, `InputReturn`, `InputType`, `SelectItem`, `SelectOptions`, `MultiSelectItem`, `MultiSelectOptions`, `LogOptions`, `TableOptions`, `ColumnOptions`, `ColumnAlign`, `MarkupOptions`, `MarkupStyleFn`, `MarkupStyles`, `HelpColor`, `Chart.BarItem`, `Chart.BarOptions`, `Chart.VerticalBarItem`, `Chart.VerticalBarOptions`, `Chart.HeatmapOptions`, `Chart.ScatterPoint`, `Chart.ScatterOptions`, `Chart.LinePoint`, `Chart.LineOptions`, `Chart.SparklineOptions`

## Authors

**Jay Deaton** — [GitHub](https://github.com/jayrdeaton)

## License

MIT
