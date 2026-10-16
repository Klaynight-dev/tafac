import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addCustomEvaluations,
  describeMove,
  describeUeOutcome,
  formatDelta,
  hasSimulatableEvaluation,
  listUeSubjects,
  parseLinearEasing,
  readSimulatedGrade,
  sampleEasing,
  speakOutcome,
} from '../src/gradeSimulation.js'
import { projectAverages } from '../src/gradesReport.js'

const evaluation = (kind, canSimulate = true) => ({ canSimulate, grade: { kind } })

test('hasSimulatableEvaluation looks through ressources and SAÉ', () => {
  assert.equal(hasSimulatableEvaluation(null), false)
  assert.equal(hasSimulatableEvaluation({ resources: [], saes: [] }), false)
  assert.equal(hasSimulatableEvaluation({ resources: [{ evaluations: [evaluation('number', false)] }], saes: [] }), false)
  assert.equal(hasSimulatableEvaluation({ resources: [], saes: [{ evaluations: [evaluation('pending')] }] }), true)
})

test('readSimulatedGrade reads grades on /20, a French comma included', () => {
  assert.deepEqual(readSimulatedGrade('12,5'), { kind: 'grade', value: 12.5 })
  assert.deepEqual(readSimulatedGrade(' 20 '), { kind: 'grade', value: 20 })
  assert.deepEqual(readSimulatedGrade('0'), { kind: 'grade', value: 0 })
  assert.deepEqual(readSimulatedGrade('14,'), { kind: 'grade', value: 14 })
  assert.deepEqual(readSimulatedGrade(''), { kind: 'empty' })
  assert.deepEqual(readSimulatedGrade('21'), { kind: 'invalid' })
  assert.deepEqual(readSimulatedGrade('-1'), { kind: 'invalid' })
  assert.deepEqual(readSimulatedGrade('abc'), { kind: 'invalid' })
})

test('describeMove tells whether an average moved', () => {
  assert.deepEqual(describeMove(12, null), { value: 12, official: 12, changed: false, delta: null })
  assert.deepEqual(describeMove(12, 12.004), { value: 12.004, official: 12, changed: false, delta: null })
  assert.equal(describeMove(12, 13).delta, 1)
  assert.deepEqual(describeMove(null, 9), { value: 9, official: null, changed: true, delta: null })
})

test('listUeSubjects keeps the UE’s subjects and the evaluations counting for it', () => {
  const report = {
    ues: [{ code: 'UE1', modules: [
      { code: 'R1', title: 'R1', kind: 'resource', coef: 2, average: 12 },
      { code: 'S1', title: 'S1', kind: 'sae', coef: 0, average: null },
    ] }],
    resources: [{ code: 'R1', title: 'Maths', evaluations: [
      { id: 'b', date: '2026-10-02', weights: [{ ue: 'UE1', weight: 1 }] },
      { id: 'c', date: null, weights: [{ ue: 'UE1', weight: 1 }] },
      { id: 'a', date: '2026-09-20', weights: [{ ue: 'UE1', weight: 1 }] },
      { id: 'x', date: '2026-09-01', weights: [{ ue: 'UE2', weight: 1 }] },
    ] }],
    saes: [{ code: 'S1', title: 'Projet', evaluations: [] }],
  }
  const subjects = listUeSubjects(report, 'UE1')
  assert.equal(subjects.length, 1)
  assert.equal(subjects[0].title, 'Maths')
  assert.equal(subjects[0].coef, 2)
  assert.deepEqual(subjects[0].evaluations.map((entry) => entry.id), ['a', 'b', 'c'])
  assert.deepEqual(listUeSubjects(report, 'UE9'), [])
})

test('describeUeOutcome tells how the UE fares against 10', () => {
  assert.equal(describeUeOutcome(9.5, 10.2).tone, 'crossed')
  assert.equal(describeUeOutcome(null, 12).tone, 'crossed')
  assert.equal(describeUeOutcome(14.44, 15.22).tone, 'up')
  assert.equal(describeUeOutcome(7, 8.5).tone, 'closer')
  assert.equal(describeUeOutcome(14.44, 12).tone, 'down')
  assert.equal(describeUeOutcome(10.4, 9.6).tone, 'dropped')
  assert.equal(describeUeOutcome(8, 6).tone, 'short')
  assert.equal(describeUeOutcome(null, 6).tone, 'short')
  assert.equal(describeUeOutcome(12, 12.001).tone, 'same')
  const closer = describeUeOutcome(7, 8.5)
  assert.equal(closer.validated, false)
  assert.equal(closer.missing, 1.5)
  assert.equal(describeUeOutcome(14, 15).missing, null)
  const capitalized = describeUeOutcome(8, 7, { capitalized: true })
  assert.equal(capitalized.validated, true)
  assert.equal(capitalized.tone, 'down')
})

test('formatDelta signs a change in points', () => {
  assert.equal(formatDelta(0.78), '+0.78')
  assert.equal(formatDelta(-1.5), '−1.5')
  assert.equal(formatDelta(0.7799999), '+0.78')
  assert.equal(formatDelta(null), null)
})

test('speakOutcome reads the reveal out in French', () => {
  assert.equal(
    speakOutcome({
      ue: describeUeOutcome(14.44, 15.22),
      general: describeMove(14.5, 14.76),
      others: [{ label: 'UE 5.2', move: describeMove(13.76, 13.9) }],
    }),
    'Moyenne de l’UE : 15,22 sur 20 au lieu de 14,44, UE validée. Moyenne générale : 14,76 sur 20 au lieu de 14,5. UE 5.2 : 13,9 sur 20 au lieu de 13,76.',
  )
  assert.equal(speakOutcome({ ue: describeUeOutcome(8, 8) }), 'Moyenne de l’UE : 8 sur 20, UE pas encore validée.')
})

test('parseLinearEasing and sampleEasing replay a CSS spring', () => {
  const points = parseLinearEasing('linear(0.000, 0.5, 1.2, 1)')
  assert.deepEqual(points, [0, 0.5, 1.2, 1])
  assert.equal(parseLinearEasing('ease-out'), null)
  assert.equal(parseLinearEasing(''), null)
  assert.equal(sampleEasing(points, 0), 0)
  assert.equal(sampleEasing(points, 1), 1)
  assert.equal(sampleEasing(points, 2 / 3), 1.2)
  assert.equal(sampleEasing(points, 1 / 6), 0.25)
  assert.equal(sampleEasing(points, 3), 1)
})

test('addCustomEvaluations adds grades typed by hand to their subject', () => {
  const releve = {
    ues: {
      UE1: { moyenne: { value: '12' }, ECTS: { total: 6 }, ressources: { R1: { coef: 2 } }, saes: {} },
      UE2: { moyenne: { value: '10' }, ECTS: { total: 6 }, ressources: { R1: { coef: 1 } }, saes: {} },
    },
    ressources: { R1: { evaluations: [{ id: 1, evaluation_type: 0, coef: 1, poids: { UE1: 1, UE2: 1 }, note: { value: '12' } }] } },
    saes: {},
    semestre: { notes: { value: '11' } },
  }
  assert.equal(addCustomEvaluations(releve, {}), releve)
  const next = addCustomEvaluations(releve, { R1: [{ id: 'custom-1', coef: 1 }] })
  assert.equal(releve.ressources.R1.evaluations.length, 1)
  assert.deepEqual(next.ressources.R1.evaluations[1].poids, { UE1: 1, UE2: 1 })
  // Without its grade the added evaluation changes nothing; with 16 the
  // subject averages 14 and both UEs move by 2.
  assert.equal(projectAverages(next, {}).ues.UE1.projected, 12)
  const projection = projectAverages(next, { 'custom-1': 16 })
  assert.equal(projection.ues.UE1.projected, 14)
  assert.equal(projection.ues.UE2.projected, 12)
})
