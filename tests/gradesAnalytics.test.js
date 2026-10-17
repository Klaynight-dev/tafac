import assert from 'node:assert/strict'
import test from 'node:test'
import {
  advanceSimulatorReach,
  describeGradesLoad,
  describeRevealForAnalytics,
  getEditedBucket,
  toGradesPageSource,
} from '../src/gradesAnalytics.js'
import { describeUeOutcome } from '../src/gradeSimulation.js'

test('page sources outside the list count as other', () => {
  assert.equal(toGradesPageSource('tile'), 'tile')
  assert.equal(toGradesPageSource('history'), 'history')
  assert.equal(toGradesPageSource('sidebar'), 'other')
  assert.equal(toGradesPageSource(undefined), 'other')
})

test('grades load outcome follows what the page renders', () => {
  assert.equal(describeGradesLoad({ status: 'loading' }), null)
  assert.equal(describeGradesLoad(), null)
  assert.deepEqual(describeGradesLoad({ status: 'error', errorKind: 'http_5xx' }), { status: 'error', errorKind: 'http_5xx' })
  // Unknown or missing categories never pass through as they are.
  assert.deepEqual(describeGradesLoad({ status: 'error', errorKind: 'ScoDoc timeout at 12:03' }), { status: 'error', errorKind: 'other' })
  assert.deepEqual(describeGradesLoad({ status: 'error', errorKind: null }), { status: 'error', errorKind: 'other' })
  // No ScoDoc relevé at all (another formation): not a failure.
  assert.deepEqual(describeGradesLoad({ status: 'error', unavailable: true, errorKind: 'http_4xx' }), { status: 'unsupported' })
  assert.deepEqual(describeGradesLoad({ status: 'ok', reportStatus: 'unsupported', emptyKind: 'missing' }), { status: 'unsupported' })
  assert.deepEqual(describeGradesLoad({ status: 'ok', reportStatus: 'unpublished', emptyKind: 'unpublished' }), { status: 'unpublished' })
  assert.deepEqual(describeGradesLoad({ status: 'ok', reportStatus: 'ok', emptyKind: 'noGrades' }), { status: 'empty' })
  assert.deepEqual(describeGradesLoad({ status: 'ok', reportStatus: 'empty', emptyKind: 'missing' }), { status: 'empty' })
  assert.deepEqual(describeGradesLoad({ status: 'ok', reportStatus: 'ok', emptyKind: null }), { status: 'ok' })
})

test('edited grades are bucketed', () => {
  assert.equal(getEditedBucket(0), null)
  assert.equal(getEditedBucket(undefined), null)
  assert.equal(getEditedBucket(1), '1')
  assert.equal(getEditedBucket(2), '2-3')
  assert.equal(getEditedBucket(3), '2-3')
  assert.equal(getEditedBucket(4), '4+')
  assert.equal(getEditedBucket(27), '4+')
})

test('the simulator remembers the furthest step reached', () => {
  let reached = advanceSimulatorReach(null, 'opened')
  assert.equal(reached, 'dial')
  reached = advanceSimulatorReach(reached, 'ue_picked')
  assert.equal(reached, 'edit')
  reached = advanceSimulatorReach(reached, 'reveal_shown')
  assert.equal(reached, 'reveal')
  // Back to editing doesn't undo having seen the reveal.
  reached = advanceSimulatorReach(reached, 'back_to_edit')
  assert.equal(reached, 'reveal')
  assert.equal(advanceSimulatorReach('edit', 'unknown'), 'edit')
})

test('reveal outcomes become directions and booleans, never numbers', () => {
  const crossed = describeRevealForAnalytics(describeUeOutcome(9.2, 10.4), { editCount: 2, addedGradeCount: 1 })
  assert.deepEqual(crossed, {
    edited_bucket: '2-3',
    added_grades: true,
    ue_direction: 'up',
    ue_validated: true,
    crossed_pass_mark: true,
  })
  assert.deepEqual(describeRevealForAnalytics(describeUeOutcome(12, 11), { editCount: 1 }), {
    edited_bucket: '1',
    added_grades: false,
    ue_direction: 'down',
    ue_validated: true,
    crossed_pass_mark: false,
  })
  assert.deepEqual(describeRevealForAnalytics(describeUeOutcome(12, 12.001), { editCount: 5 }), {
    edited_bucket: '4+',
    added_grades: false,
    ue_direction: 'same',
    ue_validated: true,
    crossed_pass_mark: false,
  })
  // No average before: the UE gets one.
  assert.equal(describeRevealForAnalytics(describeUeOutcome(null, 8), { editCount: 1 }).ue_direction, 'new')
  // A capitalised UE going down under 10 stays validated, crossing nothing.
  const capitalized = describeRevealForAnalytics(describeUeOutcome(8, 7, { capitalized: true }), { editCount: 1 })
  assert.equal(capitalized.ue_validated, true)
  assert.equal(capitalized.crossed_pass_mark, false)
  for (const value of Object.values(crossed)) assert.ok(typeof value === 'boolean' || typeof value === 'string')
})
