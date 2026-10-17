import assert from 'node:assert/strict'
import test from 'node:test'
import { DARK_SURFACE, contrastRatio, liftForDarkSurface, pickInkOn, shadeHex } from '../src/colorContrast.js'

test('contrastRatio follows WCAG', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0')
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1)
  assert.equal(contrastRatio('red', '#FFFFFF'), null)
})

test('the UE ribbon keeps the design’s light ink on dark colours, a deep shade on light ones', () => {
  // The demo's UEs: red, orange, yellow.
  assert.equal(pickInkOn('#b80004'), '#F0F0F0')
  assert.equal(pickInkOn('#f97b3d'), shadeHex('#f97b3d', 0.25))
  assert.equal(pickInkOn('#feb40b'), shadeHex('#feb40b', 0.25))
  assert.equal(shadeHex('#B80004', 0.55), '#650002')
})

test('whatever colour a department picks, the ribbon text reaches 4.5:1', () => {
  const hex = (h, s, l) => {
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
      const k = (n + h / 30) % 12
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  for (let h = 0; h < 360; h += 15) {
    for (const s of [0, 0.5, 1]) {
      for (const l of [0.1, 0.3, 0.45, 0.6, 0.75, 0.9]) {
        const color = hex(h, s, l)
        assert.ok(contrastRatio(pickInkOn(color), color) >= 4.5, `${color}: ${pickInkOn(color)}`)
      }
    }
  }
})

// Hue of a "#rrggbb", in degrees (null for a grey).
function hueOf(color) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const delta = max - Math.min(r, g, b)
  if (delta === 0) return null
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return (hue * 60 + 360) % 360
}

test('on the dark theme, a navy UE is lifted to a readable blue, hue kept', () => {
  // The demo's "Entreprendre" navy all but disappears on the dark cards.
  assert.ok(contrastRatio('#05162e', DARK_SURFACE) < 1.2)
  const lifted = liftForDarkSurface('#05162e')
  assert.ok(contrastRatio(lifted, DARK_SURFACE) >= 3)
  // Just enough: not washed out toward white.
  assert.ok(contrastRatio(lifted, DARK_SURFACE) < 3.2)
  assert.ok(Math.abs(hueOf(lifted) - hueOf('#05162e')) < 3, lifted)
})

test('UE colours that already stand out on the dark theme are left alone', () => {
  for (const color of ['#f97b3d', '#feb40b', '#80cb3f', '#FFFFFF']) assert.equal(liftForDarkSurface(color), color)
  // Not a colour it can read: as is.
  for (const color of ['red', null, '#12345']) assert.equal(liftForDarkSurface(color), color)
  // "#abc" reads as "#aabbcc".
  assert.equal(liftForDarkSurface('#fb3'), '#fb3')
  assert.ok(contrastRatio(liftForDarkSurface('#123'), DARK_SURFACE) >= 3)
})

test('whatever colour a department picks, the dark theme shows it at 3:1, its ribbon text at 4.5:1', () => {
  const hex = (h, s, l) => {
    const a = s * Math.min(l, 1 - l)
    const f = (n) => {
      const k = (n + h / 30) % 12
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }

  for (let h = 0; h < 360; h += 15) {
    for (const s of [0, 0.5, 1]) {
      for (const l of [0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6]) {
        const color = hex(h, s, l)
        const lifted = liftForDarkSurface(color)
        assert.ok(contrastRatio(lifted, DARK_SURFACE) >= 3, `${color} → ${lifted}`)
        // Idempotent: painting twice changes nothing.
        assert.equal(liftForDarkSurface(lifted), lifted, color)
        assert.ok(contrastRatio(pickInkOn(lifted), lifted) >= 4.5, `${lifted}: ${pickInkOn(lifted)}`)
        if (s > 0 && l > 0.02) assert.ok(Math.abs(((hueOf(lifted) - hueOf(color) + 540) % 360) - 180) < 4, `${color} → ${lifted} hue`)
      }
    }
  }
})
