import assert from 'node:assert/strict'
import test from 'node:test'
import { RING_SIZE, buildRingSegments, buildSegmentMidArc, readSegmentIndexAt } from '../src/ueRingGeometry.js'

test('segments split the ring evenly from 12 o\'clock, a lone one takes it whole', () => {
  const segments = buildRingSegments(4)
  assert.equal(segments.length, 4)
  assert.ok(Math.abs(segments[1].start - Math.PI / 2) < 1e-9)
  assert.ok(Math.abs(segments[3].end - 2 * Math.PI) < 1e-9)
  assert.match(buildRingSegments(1)[0].path, /^M60,0A60,60 0 1 1 /)
})

test('the pointer\'s angle picks the UE, off the ring nothing', () => {
  const middle = RING_SIZE / 2
  assert.equal(readSegmentIndexAt(middle + 5, 2, 4), 0)
  assert.equal(readSegmentIndexAt(RING_SIZE - 2, middle + 5, 4), 1)
  assert.equal(readSegmentIndexAt(2, middle - 5, 4), 3)
  assert.equal(readSegmentIndexAt(middle, middle, 4), null)
  assert.equal(readSegmentIndexAt(middle, -20, 4), null)
})

test('the fill arc runs along the band\'s middle, inside the gaps', () => {
  const arc = buildSegmentMidArc(0, Math.PI / 2)
  assert.match(arc, /^M\d+(\.\d+)?,\d+(\.\d+)?A49\.5,49\.5 0 0 1 /)
})
