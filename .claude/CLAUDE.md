# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

# termkit

Node.js terminal toolkit: a fluent CLI command builder (nested subcommands, typed/coerced options, middleware) plus interactive prompts, progress bars/spinners, tables, charts, styled markup, and ANSI-aware text utilities, all from one dependency-light package with full TypeScript support.

Standalone npm package, published unscoped as `termkit` (not part of the `@rific`/`@tastic` scoped ecosystem, though it shares the same `@infinitetoken` dev tooling — ESLint/Jest/tsconfig presets and the `infinitetoken/Workflows` reusable CI/publish workflows). Published at https://www.npmjs.com/package/termkit.

## Commands

```bash
npm run build         # tsup, outputs CJS + ESM + types to dist/
npm run lint           # ESLint check
npm run fix             # Auto-fix lint issues
npm test                 # Jest (627 tests)
npm run test:watch        # Jest in watch mode
npm run typecheck          # TypeScript type check (tsc --noEmit)
npm run verify               # lint + test + typecheck + build, in that order
npm run demo:<name>           # Run a demo script from demos/ — bar, chart, color, input, log,
                               # markup, multiselect, program, select, shell, spinner, table, text
```

Always run `npm run lint` before finishing any task.

## Release

Tag-based, via the shared `infinitetoken/Workflows` reusable publish workflow (npm trusted publishing over OIDC, no token required):

```bash
npm run release:patch   # npm version patch && git push --follow-tags
npm run release:minor   # npm version minor && git push --follow-tags
npm run release:major   # npm version major && git push --follow-tags
```

`.github/workflows/publish.yml` fires on `v*` tags and delegates to `infinitetoken/Workflows/.github/workflows/npm-publish.yml@v1` (`permissions: contents: read, id-token: write`). `prepublishOnly` runs `build` automatically; `preversion` runs `verify`.

## Architecture

`tsconfig.json` maps the `@/*` alias to `src/*` — all internal imports use it (`@/config`, `@/models/Bar`, `@/utils/color`, …) instead of relative paths.

```
src/
  index.ts                    - all public exports; also defines the module-level `Program` builder
                                 (command/option/middleware/parse/setDefaults/shell) and the
                                 `CommandDefaults` interface
  config.ts                   - global config singleton (color, pulseColors, glyphs, colors,
                                 interactive) + configure(); derives glyphs/colors defaults from
                                 TERM/LANG/NO_COLOR/FORCE_COLOR env vars
  types.ts                    - shared types: VariableType, ParsedOptions, ActionFn, MiddlewareFn
  models/
    Command.ts                - command tree node: subcommands, options, middleware, action, help
                                 text rendering, argv parsing/execution (_execute)
    Option.ts                 - option definition (short/long flag + variables + description)
    Variable.ts                - typed positional/option variable (array/enum/min/max/default) +
                                 .hint getter that renders the "(a|b, min–max, default: x)" help suffix
    TermKit.ts                 - static-method alternative to Program with the same method shape,
                                 but the *first* .command() call wins (Program's last call wins) and
                                 there is no .shell()  — see Public API for the full comparison
    Shell.ts                   - interactive REPL over a Command tree: `drill` mode (menu-driven
                                 descent through subcommands) or `free` mode (readline with tab
                                 completion)
    Bar.ts                     - single animated progress bar: determinate/indeterminate
                                 (bounce/loop/loop-reverse), gradient fg/bg colors, shimmer, rate/ETA
                                 tracking via .track()/.tick(); also re-exports utils/color's
                                 `ansiColor` (unused internally — kept importable, not part of
                                 index.ts's public exports)
    MultiBar.ts                 - renders a group of managed Bar instances stacked in one redraw block
    Spinner.ts                   - animated spinner (braille/dots/line/arrow/bounce frame sets),
                                 gradient colors, shimmer
    Input.ts                     - raw-mode single-line prompt: string/number/integer/boolean/enum,
                                 validation (regex/match/min/max/length), masking, defaults; exports
                                 input()/confirm() helpers
    Select.ts                     - interactive single-choice list prompt: always-present skip item,
                                 optional search filter, scrolling viewport, pulse-colored cursor
    MultiSelect.ts                 - interactive checkbox list prompt: min/max selection count,
                                 optional search filter, scrolling viewport
    Scrollbox.ts                    - interactive scrollable pager for a block of lines (line
                                 numbers, scrollbar thumb, optional word-wrap, vim-style navigation)
    Column.ts                        - table column definition (key/title/align/padding/value
                                 formatter)
    Table.ts                          - renders Record<string, unknown>[] as an aligned text table
                                 with per-column alignment and optional title/meta rows
    Chart.ts                          - standalone chart primitives with their own local Bar class
                                 (namespace-exported as `Chart.*` from index.ts specifically to avoid
                                 colliding with the top-level Bar progress bar): Bar, VerticalBar,
                                 Heatmap, Scatter, Line, Sparkline()
    Log.ts                             - one-line status logger (succeed/fail/warn/info glyphs) +
                                 .data() for markup()-formatted value dumps; exports a default `log`
                                 instance
    Markup.ts                          - markup(): colorized, indented rendering of arbitrary JS
                                 values (objects/arrays/dates/primitives) with per-type style hooks
                                 and per-key `translations` — a value formatter, not a tag parser
  utils/
    color.ts                           - ANSI/RGB color primitives: hex parsing, gradient
                                 interpolation, shimmer, cursor show/hide/wrap escape codes; also
                                 registers process exit/SIGINT handlers to restore the cursor
    cleanup.ts                          - process-wide SIGINT/exit cleanup registry
                                 (registerCleanup), shared by Bar/MultiBar/Spinner/Select/
                                 MultiSelect/Scrollbox
    stringLength.ts                      - visible string length (ANSI escape codes stripped)
    padLeft.ts / padRight.ts / padSides.ts - ANSI-aware string padding
    truncate.ts                           - ANSI-aware truncation with a suffix (ellipsis glyph or
                                 "..." depending on config.glyphs)
    wrap.ts                                - ANSI-aware word wrap to a column width
    findCommand.ts                         - matches + consumes the next subcommand token from argv
    findOption.ts                          - matches a short/long flag string against an Option[]
    findOptions.ts                         - consumes all leading -x/--xxx flags from argv
                                 (including --no-x negation) for a Command
    findVariable.ts                        - resolves one Variable's value from argv: coercion
                                 (also exports `coerce`), array collection, interactive prompt
                                 fallback when config.interactive is set
    findVariables.ts                       - resolves an Option's full variable list into an
                                 options-object entry
    findCommandVariables.ts                - resolves a Command's own positional variables from argv
    getVariables.ts                        - parses a variable-string spec (`<name:type(min,max)
                                 =default>`, `[name...]`, `name:a|b|c`, etc.) into Variable[]
```

## Public API

**CLI parsing**
- `Program` — module-level command builder: `.command(name, variables?, info?)` → `Command` (each call replaces the active base command — last call wins), `.option(short, long, variables, info)` → `Option`, `.middleware(fn)`, `.setDefaults({ middlewares?, options? })`, `.parse(argv)`, `.shell(options?: ShellOptions)`
- `TermKit` — static-method builder with the same method shape (`.command`, `.option`, `.middleware`, `.parse`, `.setDefaults`/settable `.defaults`) — but the *first* `.command()` call sets the base and later calls don't replace it (opposite of `Program`), and there is no `.shell()`
- `Command` — the class `Program`/`TermKit` construct; also directly usable: `.command()`/`.commands()`, `.option()`/`.options()`, `.middleware()`/`.middlewares()`, `.action(fn)`, `.version(v)`, `.description(info)`, `.variable(spec)`, `.help()`, `.parse(argv)`
- `Option`, `Variable` — option and positional/option-variable building blocks
- `Shell` (`ShellOptions`) — interactive REPL over a `Command` tree (`drill` or `free` mode, see Architecture)
- `ActionFn`, `MiddlewareFn`, `ParsedOptions`, `VariableType`, `CommandDefaults` — supporting types

**Prompts**
- `input(prompt, options?)` / `Input` (`InputOptions`, `InputType`, `InputReturn<T>`) — raw-mode single-line prompt with validation and type coercion
- `confirm(prompt, options?)` — `Input` narrowed to a y/n boolean prompt
- `select(prompt, items, options?)` / `Select` (`SelectItem`, `SelectOptions`) — single-choice list prompt
- `multiSelect(prompt, items, options?)` / `MultiSelect` (`MultiSelectItem`, `MultiSelectOptions`) — checkbox list prompt
- `scrollbox(lines, options?)` / `Scrollbox` (`ScrollboxOptions`) — scrollable pager

**Progress**
- `Bar` (`BarOptions`, `BarMode`) — animated progress bar, determinate or indeterminate
- `MultiBar` (`MultiBarOptions`) — group of managed `Bar` instances rendered together
- `Spinner` (`SpinnerOptions`) — animated spinner with selectable frame sets (`Spinner.FRAMES.braille/dots/line/arrow/bounce`)

**Display**
- `Table` (`TableOptions`) / `Column` (`ColumnOptions`, `ColumnAlign`) — aligned text table renderer
- `Chart` — namespace export (`export * as Chart`) of `Bar`, `VerticalBar`, `Heatmap`, `Scatter`, `Line` (classes, each with `.print()`/`.toString()`) and `Sparkline()` (returns a single-line string)
- `markup(value, options?)` (`MarkupOptions`, `MarkupStyles`, `MarkupStyleFn`) — colorized value formatter
- `Log` (`LogOptions`) / `log` (default instance) — one-line status logger with `.data()` for `markup()`-formatted dumps

**Text utilities**
- `padLeft`, `padRight`, `padSides` — ANSI-aware string padding
- `stringLength` — visible string length (ANSI stripped)
- `truncate` — ANSI-aware truncation with a suffix
- `wrap` — ANSI-aware word wrap

**Color / config**
- `Color` — default export of the `cosmetic` dependency, re-exported directly
- `config` (`TermKitConfig`, `HelpColor`) / `configure(opts)` — global singleton: active color, progress-bar pulse gradient, `glyphs` (Unicode vs ASCII fallback), `colors` (ANSI on/off), `interactive` (prompt for missing required variables instead of throwing)

## Testing

- Framework: Jest (via `@infinitetoken/jest-config/node`, `testEnvironment: 'node'`) + ts-jest
- `jest.setup.cjs` forces `process.stdout.isTTY = true` so the TTY-only rendering paths (Bar, Spinner, Select, Input, …) execute under Jest instead of short-circuiting
- Tests in `src/__tests__/models/`, `src/__tests__/utils/`, and `src/__tests__/integration/` (coercion, complex parsing, middleware)
- No `src/__mocks__/` — nothing external to mock; tests drive the real classes against captured `process.stdout`/`stdin`
- 627 tests across 31 suites

## Code Style

Enforced by ESLint + Prettier, run `npm run lint` before finishing any task. `eslint.config.cjs` uses the shared `@infinitetoken/eslint-config/npm-package` preset directly — no local overrides.

**Prettier config:**
- Single quotes
- No semicolons
- No trailing commas
- Print width: 1000 (effectively disabled)

**ESLint rules (warnings unless noted):**
- `prettier/prettier` — formatting
- `simple-import-sort/imports`, `simple-import-sort/exports` — imports and exports must be sorted
- `no-console` — no console statements (files that legitimately write to the terminal, e.g. `Command.ts`, `Shell.ts`, disable it with `/* eslint-disable no-console */`)
- `@typescript-eslint/no-unused-vars`
- `@typescript-eslint/no-require-imports` — off (default-on rule explicitly disabled)
- `@typescript-eslint/no-explicit-any` — off in `**/__tests__/**` and `**/__mocks__/**`
- `package-json/order-properties`, `package-json/sort-collections` — warn, scoped to `package.json` only (via `eslint-plugin-package-json`)
