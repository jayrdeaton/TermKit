/* eslint-disable no-console */
import type { Cosmetic } from 'cosmetic'
import cosmetic from 'cosmetic'
import * as readline from 'readline'

import type { Command } from '@/models/Command'

export interface ShellOptions {
  mode?: 'drill' | 'free'
  prompt?: string
  promptColor?: string
  banner?: string
  exitCommands?: string[]
  historySize?: number
}

type ResolvedOpts = Required<ShellOptions>

export class Shell {
  private root: Command
  private opts: ResolvedOpts
  private rl: readline.Interface | null = null

  constructor(root: Command, opts: ShellOptions = {}) {
    this.root = root
    this.opts = {
      mode: opts.mode ?? 'drill',
      prompt: opts.prompt ?? root.name ?? 'shell',
      promptColor: opts.promptColor ?? '',
      banner: opts.banner ?? '',
      exitCommands: opts.exitCommands ?? ['exit', 'quit'],
      historySize: opts.historySize ?? 100
    }
  }

  async run(): Promise<void> {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
      historySize: this.opts.historySize,
      completer: this.opts.mode === 'free' ? makeCompleter(this.root) : undefined
    })

    if (this.opts.banner) console.log(this.opts.banner)

    try {
      if (this.opts.mode === 'free') {
        await this.freeLoop()
      } else {
        await this.drillLoop()
      }
    } finally {
      this.rl.close()
    }
  }

  // ── Drill mode ────────────────────────────────────────────────────────

  private async drillLoop(): Promise<void> {
    while (true) {
      const exited = await this.drillFrom(this.root, [this.root.name ?? 'shell'])
      if (exited) return
    }
  }

  private async drillFrom(cmd: Command, breadcrumb: string[]): Promise<boolean> {
    while (true) {
      const token = await this.promptDrill(cmd, breadcrumb)

      if (token === null) {
        return breadcrumb.length === 1
      }

      if (this.opts.exitCommands.includes(token)) process.exit(0)
      if (token === '..') return false

      if (token === 'help') {
        cmd.help()
        continue
      }

      const sub = cmd.commandsArray.find((c) => c.name === token)
      if (!sub) {
        process.stderr.write(`Unknown command: ${token}\n`)
        continue
      }

      if (sub.commandsArray.length > 0) {
        const exited = await this.drillFrom(sub, [...breadcrumb, sub.name ?? ''])
        if (exited) return true
        continue
      }

      const vars = await this.gatherVariables(sub)
      const tokens = buildTokens(sub, vars)
      try {
        await sub._execute(tokens)
      } catch (err) {
        process.stderr.write(`${err instanceof Error ? err.message : err}\n`)
      }
      return false
    }
  }

  private async promptDrill(cmd: Command, breadcrumb: string[]): Promise<string | null> {
    const subs = cmd.commandsArray.map((c) => c.name ?? '').filter(Boolean)
    const label = this.colorize(breadcrumb.join(' '))
    const choices = [...subs, 'help'].join(', ')
    process.stdout.write(`\n  ${label}  ${choices}\n`)

    return new Promise<string | null>((resolve) => {
      let resolved = false
      const done = (val: string | null) => {
        if (!resolved) {
          resolved = true
          resolve(val)
        }
      }
      this.rl!.question('> ', (answer) => done(answer.trim() || null))
      this.rl!.once('close', () => done(null))
    })
  }

  private async gatherVariables(cmd: Command): Promise<Record<string, string>> {
    const result: Record<string, string> = {}
    if (!cmd.variables) return result

    for (const v of cmd.variables) {
      const name = v.name ?? 'value'
      const hint = v.hint ? ` ${v.hint}` : ''

      while (true) {
        const answer = await new Promise<string | null>((resolve) => {
          let resolved = false
          const done = (val: string | null) => {
            if (!resolved) {
              resolved = true
              resolve(val)
            }
          }
          this.rl!.question(`  ${name}${hint}: `, (ans) => done(ans.trim() || null))
          this.rl!.once('close', () => done(null))
        })

        const value = answer ?? v.default ?? null

        if (!value && v.required) {
          process.stderr.write(`  ${name} is required\n`)
          continue
        }

        if (value) {
          if (v.type === 'enum' && v.enum && !v.enum.includes(value)) {
            process.stderr.write(`  Must be one of: ${v.enum.join(', ')}\n`)
            continue
          }
          result[name] = value
        }
        break
      }
    }

    return result
  }

  // ── Free mode ─────────────────────────────────────────────────────────

  private async freeLoop(): Promise<void> {
    const prompt = `${this.colorize(this.opts.prompt)} > `
    this.rl!.setPrompt(prompt)
    this.rl!.prompt()

    for await (const line of this.rl!) {
      const trimmed = line.trim()
      if (!trimmed) {
        this.rl!.prompt()
        continue
      }
      if (this.opts.exitCommands.includes(trimmed)) break
      const tokens = tokenize(trimmed)
      try {
        await this.root._execute(tokens)
      } catch (err) {
        process.stderr.write(`${err instanceof Error ? err.message : err}\n`)
      }
      this.rl!.prompt()
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  private colorize(text: string): string {
    const c = this.opts.promptColor
    if (!c || !process.stdout.isTTY) return text
    try {
      if (c.startsWith('#')) return cosmetic.hex(c).encoder(text)
      if (/^\d+$/.test(c)) return cosmetic.xterm(Number(c)).encoder(text)
      const style = cosmetic[c as keyof Cosmetic]
      if (style && typeof (style as Cosmetic).encoder === 'function') return (style as Cosmetic).encoder(text)
    } catch {
      // fall through
    }
    return text
  }
}

// ── Module-level helpers ──────────────────────────────────────────────────

function tokenize(line: string): string[] {
  const tokens: string[] = []
  let current = ''
  let inQuote: '"' | "'" | null = null

  for (const ch of line) {
    if (inQuote) {
      if (ch === inQuote) {
        inQuote = null
      } else {
        current += ch
      }
    } else if (ch === '"' || ch === "'") {
      inQuote = ch
    } else if (ch === ' ' || ch === '\t') {
      if (current) {
        tokens.push(current)
        current = ''
      }
    } else {
      current += ch
    }
  }

  if (current) tokens.push(current)
  return tokens
}

function buildTokens(cmd: Command, vars: Record<string, string>): string[] {
  if (!cmd.variables) return []
  return cmd.variables.map((v) => vars[v.name ?? '']).filter((v): v is string => v !== undefined && v !== '')
}

function makeCompleter(root: Command): readline.Completer {
  return (line: string) => {
    const tokens = tokenize(line)
    let cmd = root

    for (const token of tokens.slice(0, -1)) {
      const sub = cmd.commandsArray.find((c) => c.name === token)
      if (!sub) break
      cmd = sub
    }

    const partial = tokens[tokens.length - 1] ?? ''
    const names = [...cmd.commandsArray.map((c) => c.name ?? '').filter(Boolean), 'help']
    const hits = names.filter((n) => n.startsWith(partial))
    return [hits.length ? hits : names, partial] as [string[], string]
  }
}
