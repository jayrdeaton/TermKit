import type { VariableType } from '@/types'

interface VariableData {
  array?: boolean
  default?: string
  enum?: string[]
  max?: number
  min?: number
  name?: string
  raw?: string
  required?: boolean
  type?: VariableType
}

export class Variable {
  array = false
  default: string | null = null
  enum: string[] | null = null
  max: number | null = null
  min: number | null = null
  name: string | null = null
  raw: string | null = null
  required = false
  type: VariableType = 'string'
  value: unknown[] | null = null

  constructor(data?: VariableData) {
    if (!data) return
    if (data.array) this.array = data.array
    if (data.default !== undefined) this.default = data.default
    if (data.enum) this.enum = data.enum
    if (data.max !== undefined) this.max = data.max
    if (data.min !== undefined) this.min = data.min
    if (data.name) this.name = data.name
    if (data.raw) this.raw = data.raw
    if (data.required) this.required = data.required
    if (data.type) this.type = data.type
    if (this.array) this.value = []
  }

  get hint(): string | null {
    const parts: string[] = []
    if (this.type === 'enum' && this.enum) parts.push(this.enum.join('|'))
    if (this.min !== null && this.max !== null) parts.push(`${this.min}-${this.max}`)
    else if (this.min !== null) parts.push(`>= ${this.min}`)
    else if (this.max !== null) parts.push(`<= ${this.max}`)
    if (this.default !== null) parts.push(`default: ${this.default}`)
    return parts.length > 0 ? `(${parts.join(', ')})` : null
  }
}
