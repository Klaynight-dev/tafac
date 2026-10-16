// The UE ring's geometry ("UE validées" card, the grade detail's weights):
// one segment per UE around a 120×120 box, parallel gaps between them, and
// the pointer's angle telling which UE it's on. Pure, so it's tested in Node.

export const RING_SIZE = 120
export const OUTER_RADIUS = 60
export const INNER_RADIUS = 39
// Gap between segments, in px, kept parallel (as wide inside as outside).
export const RING_GAP = 6
// The hover follows the pointer's angle anywhere on the ring, gaps included,
// so crossing a gap moves straight to the next UE; it clears off the ring
// (this much beyond its edges) or in the hole.
const HOVER_SLACK = 6

// 0 rad at 12 o'clock, clockwise.
export function pointAt(angle, radius) {
  return [RING_SIZE / 2 + radius * Math.sin(angle), RING_SIZE / 2 - radius * Math.cos(angle)]
}

// The UE under a pointer at (x, y) in the ring's box, or null off the ring.
export function readSegmentIndexAt(x, y, count) {
  const dx = x - RING_SIZE / 2
  const dy = y - RING_SIZE / 2
  const distance = Math.hypot(dx, dy)
  if (count === 0 || distance < INNER_RADIUS - HOVER_SLACK || distance > OUTER_RADIUS + HOVER_SLACK) {
    return null
  }

  // 0 at 12 o'clock, clockwise, in [0, 2π).
  const angle = (Math.atan2(dx, -dy) + 2 * Math.PI) % (2 * Math.PI)
  return Math.min(count - 1, Math.floor(angle / ((2 * Math.PI) / count)))
}

// One ring segment between two angles, its gaps trimmed separately on the
// outer and inner edge so they stay parallel. Other radii than the card's
// for a ring of another thickness (the simulator's dial).
export function buildSegmentPath(start, end, gap, outer = OUTER_RADIUS, inner = INNER_RADIUS) {
  const outerTrim = gap / 2 / outer
  const innerTrim = gap / 2 / inner
  const [x1, y1] = pointAt(start + outerTrim, outer)
  const [x2, y2] = pointAt(end - outerTrim, outer)
  const [x3, y3] = pointAt(end - innerTrim, inner)
  const [x4, y4] = pointAt(start + innerTrim, inner)
  const largeArc = end - start > Math.PI ? 1 : 0
  return `M${x1},${y1}A${outer},${outer} 0 ${largeArc} 1 ${x2},${y2}L${x3},${y3}A${inner},${inner} 0 ${largeArc} 0 ${x4},${y4}Z`
}

// `count` equal segments from 12 o'clock, clockwise: each one's angles and
// path. A lone segment gets the whole ring, no gap.
export function buildRingSegments(count) {
  const step = (2 * Math.PI) / Math.max(count, 1)
  return Array.from({ length: count }, (_, index) => {
    const start = index * step
    const end = (index + 1) * step
    return {
      start,
      end,
      path: count === 1 ? buildSegmentPath(0, 2 * Math.PI - 0.0001, 0) : buildSegmentPath(start, end, RING_GAP),
    }
  })
}

// The middle line of a segment (gaps trimmed at the band's mid radius), as
// an arc to stroke: drawn with pathLength 1, a dash of `share` fills that
// part of the segment from its start.
export function buildSegmentMidArc(start, end, gap = RING_GAP) {
  const radius = (OUTER_RADIUS + INNER_RADIUS) / 2
  const trim = gap / 2 / radius
  const from = start + trim
  const to = Math.max(from, end - trim)
  const [x1, y1] = pointAt(from, radius)
  const [x2, y2] = pointAt(to, radius)
  const largeArc = to - from > Math.PI ? 1 : 0
  return `M${x1},${y1}A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2}`
}
