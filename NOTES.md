# TermKit Ideas

Scratch pad for things to build, improve, or explore.

---

## New Components

**Dialog / Confirm box**
A framed modal-style prompt — title, body text, and Yes/No (or custom) buttons. Different from `confirm()` in Input which is just inline text. Useful when you want to visually interrupt flow with something that feels weighty.

**Progress steps / Stepper**
Numbered steps with status glyphs: pending / active / done / failed. Good for multi-phase CLI workflows (think install wizards, deploy pipelines). Pairs well with Spinner for the active step.

**Tree**
Expandable/collapsible tree of nodes. Useful for showing file structures, dependency graphs, nested config. Arrow keys to navigate, enter/space to expand.

**DatePicker / TimePicker**
Interactive date/time input that avoids freeform string parsing. Could be minimal — just up/down on each field segment (year, month, day).

**Notification / Toast**
A temporary overlay line that appears at the bottom (or top) of the terminal and auto-dismisses after N ms. Doesn't block the rest of the output stream.

**Diff viewer**
Two-column or unified diff with red/green highlighting. Useful for showing what changed before a destructive operation. Could take two strings or two line arrays.

---

## Enhancements to Existing Components

**Scrollbox — live/streaming mode**
Add a `push(line: string)` method so you can tail a log while the box is open. Auto-scroll when the viewport is already at the bottom, stay put when the user has scrolled up. Would need a `live` option to signal this mode.

**Scrollbox — search**
`/` to enter a search query, `n`/`N` to jump between matches, matching lines highlighted. Same pattern as MultiSelect's search filter but non-destructive (shows all lines, highlights matches).

**Select / MultiSelect — grouped items**
Support section headers between items (non-selectable dividers with a label). Useful when a list has natural categories.

**Table — interactive mode**
Add an optional row-selection mode so Table can be used like a spreadsheet navigator. Arrow keys move a cursor, enter selects a row and resolves it.

**Markup — more tag support**
`<code>` for inline monospace, `<link>` that renders as a terminal hyperlink (OSC 8), `<kbd>` for keyboard shortcut display.

**Log — structured / JSON mode**
If a line is valid JSON, pretty-print it with syntax coloring automatically. Opt-in via `{ json: true }`.

**Spinner — multi-step**
`spinner.step('Next message')` that updates the text and resets the animation without stopping. Avoids `stop()` + `start()` churn in long workflows.

**Bar — sparkline variant**
A single-row bar made of braille dot characters (`⣀⣄⣆⣇⡇`) for inline history charts — think bandwidth over time in one line.

---

## Infrastructure / DX

**Shared viewport/redraw utility**
Select, MultiSelect, and Scrollbox all implement the same `CURSOR_UP` + `\x1b[0J` + `lastDrawnLines` pattern. Worth extracting into a small internal `Viewport` helper so the logic lives in one place.

**`process.stdout.columns` fallback handling**
Currently each component that needs terminal width reads `process.stdout.columns ?? 80` inline. A single shared `termWidth()` helper could also handle resize events (`SIGWINCH`) and re-render if the component is active.

**Non-TTY fallback behavior**
Right now interactive components throw on non-TTY. Could add a `{ fallback: true }` option that degrades gracefully — e.g. Select just returns the first item, MultiSelect returns all items, Scrollbox prints and exits immediately. Useful for piped/CI contexts.

**Accessibility / screen reader hints**
Emit ARIA-style terminal annotations where supported (e.g. `\x1b]1337;` sequences in iTerm). Long shot but worth noting.

**Rename `glyphs` → `unicode`** *(breaking change)*
Consistent rename across `TermKitConfig`, `LogOptions`, `BarOptions`, `SpinnerOptions`, and any other per-component option that currently exposes `glyphs` (e.g. `config.glyphs`, `configure({ glyphs })`). Clearer name for what the option actually controls.

---

## Not Yet Built (identified during recent work)

**Piped stdin reader**
A `readStdin()` helper that buffers all of `process.stdin` when it is not a TTY. Covers the common `cat data.json | my-cli` pattern. Should return `null` immediately when stdin is a TTY so callers don't need separate guards.

```ts
const raw   = await readStdin()           // string
const data  = await readStdin('json')     // parsed JSON
const lines = await readStdin('lines')    // string[]
```

**Raw keypress capture**
A `keypress(prompt?)` primitive that reads a single keypress and returns a structured key object. Needed for building custom interactive UIs that don't fit the existing Select/Input shapes.

```ts
const key = await keypress('Press any key to continue…')
// { name: 'up', ctrl: false, shift: false, meta: false, sequence: '\x1b[A' }
```

Return type: `{ name, sequence, ctrl, shift, meta }`. Restores raw mode on exit and participates in the global SIGINT cleanup registry.

**`tasks()` — high-level parallel runner on top of MultiBar**
Accepts an array of labelled async functions and runs them with a progress bar each, with optional concurrency control. Each task function receives a `progress(0–1)` callback. Automatically marks bars succeed/fail based on resolved/rejected promises.

```ts
await tasks([
  { label: 'Download assets',  run: async (p) => { … p(0.5); … p(1) } },
  { label: 'Compile sources',  run: compileSources },
  { label: 'Run tests',        run: runTests },
], { concurrency: 2 })
```

Thin wrapper — just wires up `MultiBar.add()`, `bar.track()`, `bar.tick()`, and `bar.succeed()`/`bar.fail()` so callers don't have to.

**`Box` — bordered panel primitive**
Wraps a string or multi-line content in a Unicode border with an optional title. One class, `toString()` + `print()`, same interface as Table and Chart.

```ts
new Box('Deployment complete.\nAll 3 services healthy.', {
  title: 'Deploy status',
  style: 'rounded',   // single | double | rounded | bold | dashed
  color: '#22c55e',
}).print()

// ╭─ Deploy status ─────────────────╮
// │  Deployment complete.           │
// │  All 3 services healthy.        │
// ╰─────────────────────────────────╯
```
