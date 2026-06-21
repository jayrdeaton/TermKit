# Interactive Shell Mode

## Goal

Add an opt-in interactive shell mode to TermKit. Calling `Program.shell()` opens a persistent REPL that guides the user through the command tree — drilling down one level at a time until a leaf action is reached, executing it, then returning to the root prompt. A free-form mode (full command per line) is also supported.

---

## UX

### Drill mode (default)

The shell steps through one level at a time. At each level it lists available subcommands, prompts for one, then descends. When a leaf command is reached it prompts for any required variables, runs the action, and returns to the root.

```
$ myapp
  myapp  deploy, config, help
> deploy

  myapp deploy  prod, staging, help
> prod

  myapp deploy prod  [env]
> env: staging

  …action runs…

  myapp  deploy, config, help
> 
```

- Pressing **Enter** on an empty line at the root exits.
- Typing `exit` or `quit` exits at any level.
- Typing `help` at any level prints that command's help then stays at that level.
- Typing `..` at a subcommand level goes back one level.

### Free mode

The shell accepts a full command string per line, tokenizes it, and runs it exactly like `Program.parse()`.

```
$ myapp
myapp > deploy prod --env staging
…action runs…
myapp > 
```

---

## API

```ts
// Entry point — starts the shell and never returns until the user exits
await Program.shell(options?)

// Options type (also exported)
export interface ShellOptions {
  mode?: 'drill' | 'free'   // default: 'drill'
  prompt?: string            // free-mode prompt prefix, default: program name
  promptColor?: string       // cosmetic color key, hex, or xterm number
  banner?: string            // text printed once on entry
  exitCommands?: string[]    // default: ['exit', 'quit']
  historySize?: number       // readline history length, default: 100
}
```

---

## Architecture

### Problem with current `Command.parse()`

`parse()` does two things that are entangled:

1. Strips `argv[0]` and `argv[1]` (the node binary and script path).
2. Runs the token-matching loop.

The shell needs step 2 without step 1. We need to split them.

### Refactor plan

Extract the loop body into a private `Command._execute(tokens: string[]): Promise<unknown>` method. `parse()` becomes a thin wrapper that strips argv then calls `_execute()`. The Shell calls `_execute()` directly.

---

## Tasks

### Task 1 — Extract `Command._execute()`

**File:** `src/models/Command.ts`

Split `parse()` into:

```ts
// Public — strips argv[0,1], delegates to _execute
async parse(input: string[]): Promise<unknown> {
  const tokens = input.slice(2)
  return this._execute(tokens)
}

// Internal — operates on already-tokenized input
async _execute(tokens: string[]): Promise<unknown> {
  // current body of parse(), minus the splice(0,2) call
  // _source is set to tokens (not the full argv)
}
```

The `options._source` value inside `_execute` should be set to the `tokens` array rather than trying to reconstruct from argv. This keeps downstream code unchanged.

---

### Task 2 — Create `src/models/Shell.ts`

New `Shell` class. Uses Node's built-in `readline` module for line input — this gives us history, line editing, and tab completion for free without duplicating the raw-mode logic already in `Input`.

```ts
import * as readline from 'readline'
import type { Command } from '@/models/Command'
import type { ParsedOptions } from '@/types'

export interface ShellOptions {
  mode?: 'drill' | 'free'
  prompt?: string
  promptColor?: string
  banner?: string
  exitCommands?: string[]
  historySize?: number
}

export class Shell {
  private root: Command
  private opts: Required<ShellOptions>

  constructor(root: Command, opts: ShellOptions = {}) { … }

  async run(): Promise<void> {
    if (this.opts.banner) console.log(this.opts.banner)
    if (this.opts.mode === 'free') return this.freeLoop()
    return this.drillLoop()
  }

  // ── Drill mode ────────────────────────────────────────────────────

  private async drillLoop(): Promise<void> {
    // breadcrumb tracks current path for the prompt label
    // e.g. ['myapp', 'deploy']
    while (true) {
      await this.drillFrom(this.root, [this.root.name ?? 'shell'])
    }
  }

  private async drillFrom(cmd: Command, breadcrumb: string[]): Promise<void> {
    while (true) {
      const token = await this.promptDrill(cmd, breadcrumb)

      if (token === null || token === '') {
        if (breadcrumb.length === 1) return  // exit at root
        return                               // go up one level
      }

      const exit = this.opts.exitCommands
      if (exit.includes(token)) process.exit(0)
      if (token === '..') return

      if (token === 'help') {
        cmd.help()
        continue
      }

      // Try to match a subcommand
      const sub = cmd.commandsArray.find(c => c.name === token)
      if (!sub) {
        process.stderr.write(`Unknown command: ${token}\n`)
        continue
      }

      // If sub has further subcommands, recurse down
      if (sub.commandsArray.length > 0) {
        await this.drillFrom(sub, [...breadcrumb, sub.name ?? ''])
        continue
      }

      // Leaf — gather variables interactively then execute
      const vars = await this.gatherVariables(sub)
      const tokens = buildTokens(sub, vars)
      await (sub as any)._execute(tokens)
      // returns to root after execution (drillFrom returns, outer loop restarts)
      return
    }
  }

  // Prints the list of available subcommands then prompts for one token
  private async promptDrill(cmd: Command, breadcrumb: string[]): Promise<string | null> { … }

  // For each Variable on the command, prompt the user for a value
  private async gatherVariables(cmd: Command): Promise<Record<string, string>> { … }

  // ── Free mode ─────────────────────────────────────────────────────

  private async freeLoop(): Promise<void> {
    // readline interface kept open across iterations for history
    const rl = createRl(this.opts)
    for await (const line of rl) {
      const trimmed = line.trim()
      if (!trimmed) continue
      if (this.opts.exitCommands.includes(trimmed)) break
      const tokens = tokenize(trimmed)
      try {
        await (this.root as any)._execute(tokens)
      } catch (err) {
        process.stderr.write(`${err instanceof Error ? err.message : err}\n`)
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

// Splits a string on whitespace, respecting "quoted strings"
function tokenize(line: string): string[] { … }

// Builds a flat token array from a command + gathered variable values
// so it can be passed back through _execute
function buildTokens(cmd: Command, vars: Record<string, string>): string[] { … }

// Creates a readline.Interface with history, tab completion, and styling
function createRl(opts: Required<ShellOptions>): readline.Interface { … }
```

**Tab completion** — the `readline.createInterface` `completer` callback receives the partial line and returns completions. In drill mode this completes against the current command's `commandStrings`. In free mode it resolves the token chain and completes against whichever subcommand the prefix has reached.

---

### Task 3 — Add `Program.shell()` to `src/index.ts`

```ts
import { Shell } from '@/models/Shell'
export type { ShellOptions } from '@/models/Shell'
export { Shell } from '@/models/Shell'

export const Program = {
  // … existing methods …

  shell: async (options?: ShellOptions): Promise<void> => {
    if (!base) throw new Error('No command defined')
    return new Shell(base, options).run()
  },
}
```

---

### Task 4 — Drill-mode variable gathering

When `Shell.gatherVariables()` hits a required variable it uses `Input.ask()` with the variable's name as the prompt and any `enum`, `min`, `max`, `default` constraints forwarded from `Variable`. Optional variables (wrapped in `[…]`) allow the user to skip with Enter.

Variable metadata lives on `Variable` instances already — we just need to map from `Variable` fields to `InputOptions` fields:

| Variable field | InputOptions field |
|---|---|
| `type` | `type` |
| `enum` | `enum` |
| `min` / `max` | `min` / `max` |
| `default` | `default` |
| `required` (derived from `raw` — no `[…]`) | `required` |

---

### Task 5 — Export and type cleanup

- Export `Shell` and `ShellOptions` from `src/index.ts`.
- Export `ShellOptions` from `src/types.ts` or keep in `Shell.ts` (prefer colocation — keep in `Shell.ts`, re-export from `index.ts`).

---

## Files changed

| File | Change |
|---|---|
| `src/models/Command.ts` | Extract `_execute(tokens)`, `parse()` becomes thin wrapper |
| `src/models/Shell.ts` | New — `Shell` class, `ShellOptions`, helpers |
| `src/index.ts` | Add `Program.shell()`, export `Shell` + `ShellOptions` |

No changes to `types.ts`, `config.ts`, or any existing model needed.

---

## Out of scope (future)

- Persistent history file across sessions (readline-history-file npm package or manual `fs` append)
- Syntax-highlighted input as you type
- Fuzzy matching for mistyped subcommands
- `--interactive` / `-i` flag wired into `Program.parse()` as a built-in option

---

## Future breaking changes

- Rename `config.glyphs` / `configure({ glyphs })` → `unicode` for clarity. Consistent rename across `TermKitConfig`, `LogOptions`, `BarOptions`, `SpinnerOptions`, and any other per-component option that exposes `glyphs`.
