import { config } from '../../config'
import {
  parseHex,
  lerpColor,
  interpolateColor,
  formatColor,
  colorText,
  dimColor,
  shimmerFactor,
  applyShimmer,
  DIM,
  RESET,
} from '../../utils/color'

describe('parseHex', () => {
  it('parses red', () => {
    expect(parseHex('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
  })

  it('parses green', () => {
    expect(parseHex('#00ff00')).toEqual({ r: 0, g: 255, b: 0 })
  })

  it('parses blue', () => {
    expect(parseHex('#0000ff')).toEqual({ r: 0, g: 0, b: 255 })
  })

  it('parses white', () => {
    expect(parseHex('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('parses black', () => {
    expect(parseHex('#000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('parses an arbitrary hex color', () => {
    expect(parseHex('#c026d3')).toEqual({ r: 192, g: 38, b: 211 })
  })
})

describe('lerpColor', () => {
  const black = { r: 0, g: 0, b: 0 }
  const white = { r: 255, g: 255, b: 255 }

  it('returns the first color at t=0', () => {
    expect(lerpColor(black, white, 0)).toEqual(black)
  })

  it('returns the second color at t=1', () => {
    expect(lerpColor(black, white, 1)).toEqual(white)
  })

  it('returns the midpoint at t=0.5', () => {
    expect(lerpColor(black, white, 0.5)).toEqual({ r: 128, g: 128, b: 128 })
  })

  it('interpolates mixed channels correctly', () => {
    const a = { r: 0, g: 100, b: 200 }
    const b = { r: 100, g: 0, b: 0 }
    const result = lerpColor(a, b, 0.5)
    expect(result.r).toBe(50)
    expect(result.g).toBe(50)
    expect(result.b).toBe(100)
  })
})

describe('interpolateColor', () => {
  const red = { r: 255, g: 0, b: 0 }
  const blue = { r: 0, g: 0, b: 255 }

  it('returns the first color at t=0', () => {
    expect(interpolateColor([red, blue], 0)).toEqual(red)
  })

  it('returns the last color at t=1', () => {
    expect(interpolateColor([red, blue], 1)).toEqual(blue)
  })

  it('clamps t below 0 to the first color', () => {
    expect(interpolateColor([red, blue], -1)).toEqual(red)
  })

  it('clamps t above 1 to the last color', () => {
    expect(interpolateColor([red, blue], 2)).toEqual(blue)
  })

  it('interpolates the midpoint of a 2-stop gradient', () => {
    const result = interpolateColor([red, blue], 0.5)
    expect(result.r).toBe(128)
    expect(result.b).toBe(128)
    expect(result.g).toBe(0)
  })

  it('selects the correct segment in a 3-stop gradient', () => {
    const green = { r: 0, g: 255, b: 0 }
    // t=0.25 → segment 0, halfway through red→green
    const result = interpolateColor([red, green, blue], 0.25)
    expect(result.r).toBe(128)
    expect(result.g).toBe(128)
    expect(result.b).toBe(0)
  })
})

describe('formatColor', () => {
  beforeEach(() => { process.stdout.isTTY = true; config.colors = true })
  afterEach(() => { process.stdout.isTTY = false; config.colors = false })

  it('returns the correct ANSI foreground code in TTY', () => {
    expect(formatColor(38, { r: 255, g: 0, b: 0 })).toBe('\x1b[38;2;255;0;0m')
  })

  it('returns the correct ANSI background code in TTY', () => {
    expect(formatColor(48, { r: 0, g: 255, b: 0 })).toBe('\x1b[48;2;0;255;0m')
  })

  it('returns an empty string when colors disabled', () => {
    config.colors = false
    expect(formatColor(38, { r: 255, g: 0, b: 0 })).toBe('')
  })
})

describe('colorText', () => {
  beforeEach(() => { process.stdout.isTTY = true; config.colors = true })
  afterEach(() => { process.stdout.isTTY = false; config.colors = false })

  it('returns plain text when colors disabled', () => {
    config.colors = false
    expect(colorText('#ff0000', 'hello')).toBe('hello')
  })

  it('wraps text in ANSI RGB codes when given a hex color', () => {
    const result = colorText('#ff0000', 'hello')
    expect(result).toBe(`\x1b[38;2;255;0;0mhello${RESET}`)
  })

  it('wraps text in the provided ANSI code when not a hex color', () => {
    const result = colorText('\x1b[32m', 'hello')
    expect(result).toBe(`\x1b[32mhello${RESET}`)
  })
})

describe('dimColor', () => {
  it('scales each channel by the DIM constant', () => {
    const result = dimColor({ r: 100, g: 200, b: 50 })
    expect(result).toEqual({
      r: Math.round(100 * DIM),
      g: Math.round(200 * DIM),
      b: Math.round(50 * DIM),
    })
  })

  it('produces integer channel values', () => {
    const result = dimColor({ r: 255, g: 255, b: 255 })
    expect(Number.isInteger(result.r)).toBe(true)
    expect(Number.isInteger(result.g)).toBe(true)
    expect(Number.isInteger(result.b)).toBe(true)
  })

  it('dims black to black', () => {
    expect(dimColor({ r: 0, g: 0, b: 0 })).toEqual({ r: 0, g: 0, b: 0 })
  })
})

describe('shimmerFactor', () => {
  it('returns 1 when amplitude is 0', () => {
    expect(shimmerFactor(0, 0, 0)).toBe(1)
  })

  it('varies with different t values when amplitude > 0', () => {
    const f1 = shimmerFactor(0, 0, 1)
    const f2 = shimmerFactor(0.25, 0, 1)
    expect(f1).not.toBe(f2)
  })

  it('stays within [0, 1] range', () => {
    for (let t = 0; t <= 1; t += 0.1) {
      const f = shimmerFactor(t, 0, 1)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })
})

describe('applyShimmer', () => {
  it('returns the original color unchanged when amplitude is 0', () => {
    const color = { r: 100, g: 150, b: 200 }
    expect(applyShimmer(color, 0, 0, 0)).toEqual(color)
  })

  it('scales channels by the shimmer factor when amplitude > 0', () => {
    const color = { r: 200, g: 100, b: 50 }
    // t=0, phase=0, amplitude=1 → wave=0.5, factor=0.5
    const result = applyShimmer(color, 0, 0, 1)
    expect(result.r).toBe(Math.round(200 * 0.5))
    expect(result.g).toBe(Math.round(100 * 0.5))
    expect(result.b).toBe(Math.round(50 * 0.5))
  })

  it('produces integer channel values', () => {
    const result = applyShimmer({ r: 123, g: 45, b: 67 }, 0.1, 0, 0.5)
    expect(Number.isInteger(result.r)).toBe(true)
    expect(Number.isInteger(result.g)).toBe(true)
    expect(Number.isInteger(result.b)).toBe(true)
  })
})
