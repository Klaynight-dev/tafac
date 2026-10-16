// WCAG contrast for the colours ScoDoc gives its UEs ("#rrggbb"), so text
// set on them stays readable whatever the department picked. Pure: tested
// in Node.

const LIGHT_INK = '#F0F0F0'
// Normal-size text (the UE ribbon's 17px semibold isn't "large" for WCAG).
const MIN_CONTRAST = 4.5
// Graphics that carry meaning (a ring segment, a ribbon, a coin): WCAG's
// 3:1 for non-text contrast (1.4.11).
const MIN_GRAPHIC_CONTRAST = 3
// The dark theme's card colour (--color-widget-bg in index.css), what UE
// colours sit on there.
export const DARK_SURFACE = '#1c1c1c'

function parseHex(color) {
  const text = String(color ?? '').trim()
  // "#abc" is "#aabbcc".
  const short = /^#([0-9a-f]{3})$/i.exec(text)
  const match = short ? [null, short[1].replace(/./g, '$&$&')] : /^#([0-9a-f]{6})$/i.exec(text)
  if (!match) return null
  const value = parseInt(match[1], 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function toHex(channels) {
  return `#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
}

function luminance(channels) {
  const [r, g, b] = channels.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(foreground, background) {
  const front = parseHex(foreground)
  const back = parseHex(background)
  if (!front || !back) return null
  const [lighter, darker] = [luminance(front), luminance(back)].sort((left, right) => right - left)
  return (lighter + 0.05) / (darker + 0.05)
}

function toHsl([r, g, b]) {
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return [0, 0, lightness]
  const delta = max - min
  const saturation = delta / (1 - Math.abs(2 * lightness - 1))
  let hue
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4
  return [(hue * 60 + 360) % 360, saturation, lightness]
}

function fromHsl([hue, saturation, lightness]) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lightness - chroma / 2
  const [r, g, b] = hue < 60 ? [chroma, x, 0]
    : hue < 120 ? [x, chroma, 0]
      : hue < 180 ? [0, chroma, x]
        : hue < 240 ? [0, x, chroma]
          : hue < 300 ? [x, 0, chroma]
            : [chroma, 0, x]
  return [r, g, b].map((channel) => Math.min(255, Math.max(0, (channel + m) * 255)))
}

// A UE colour on the dark theme: as is when it stands out from the dark
// surface (3:1), otherwise lifted just enough to, in lightness only (hue and
// saturation kept: a navy stays a blue, a brown an orange-brown). ScoDoc's
// dark UE colours would otherwise melt into the cards. Lifting only raises
// the luminance, so the smallest lift that reaches the contrast is found by
// halving. Idempotent; anything but "#rrggbb" / "#rgb" is returned as is.
export function liftForDarkSurface(color, surface = DARK_SURFACE, minContrast = MIN_GRAPHIC_CONTRAST) {
  const channels = parseHex(color)
  if (!channels || !parseHex(surface) || contrastRatio(color, surface) >= minContrast) return color

  const [hue, saturation, lightness] = toHsl(channels)
  // The lightest it can go (white at most) only ever gets brighter.
  let low = lightness
  let high = 1
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2
    if (contrastRatio(toHex(fromHsl([hue, saturation, middle])), surface) >= minContrast) high = middle
    else low = middle
  }
  return toHex(fromHsl([hue, saturation, high]))
}

// The colour scaled toward black: `factor` 0.55 is the ribbon's shadow
// (Figma's #660000 for #B80004), 0.25 a deep ink in the same hue.
export function shadeHex(color, factor) {
  const channels = parseHex(color)
  return channels ? toHex(channels.map((channel) => channel * factor)) : '#000000'
}

// Text on a UE colour: the design's light ink while it reads (dark colours),
// otherwise a deep shade of the colour itself (yellows, oranges), and plain
// black or white as the last resort.
export function pickInkOn(background) {
  if (!parseHex(background)) return LIGHT_INK
  if (contrastRatio(LIGHT_INK, background) >= MIN_CONTRAST) return LIGHT_INK
  const deep = shadeHex(background, 0.25)
  if (contrastRatio(deep, background) >= MIN_CONTRAST) return deep
  return contrastRatio('#000000', background) >= contrastRatio('#FFFFFF', background) ? '#000000' : '#FFFFFF'
}
