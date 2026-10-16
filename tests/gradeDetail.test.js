import assert from 'node:assert/strict'
import test from 'node:test'
import { buildDemoGradesPayload } from '../src/demoAccount.js'
import { buildGradesReport } from '../src/gradesReport.js'
import {
  buildUeShareRing,
  computeEvaluationShares,
  describeBucket,
  describeGapToMean,
  findEvaluation,
  formatShare,
  gradeBucket,
  readDistribution,
  summarizeDistribution,
} from '../src/gradeDetail.js'

function evaluation(id, { coef = 1, weights = {}, kind = 'number', value = 12, typeLabel = null, promo = {} } = {}) {
  return {
    id,
    coef,
    typeLabel,
    grade: { kind, value: kind === 'number' ? value : null },
    promo: { min: null, moy: null, max: null, ...promo },
    weights: Object.entries(weights).map(([ue, weight]) => ({ ue, weight })),
  }
}

// R1.01 feeds UE1.1 (coef 3 of 4) and UE1.2 (coef 1 of 3).
function buildReport(evaluations) {
  const module = { code: 'R1.01', title: 'Maths', kind: 'resource', evaluations }
  return {
    module,
    report: {
      ues: [
        { code: 'UE1.1', title: 'Comprendre', color: '#b80004', modules: [{ code: 'R1.01', coef: 3 }, { code: 'R1.02', coef: 1 }] },
        { code: 'UE1.2', title: 'Concevoir', color: '#f97b3d', modules: [{ code: 'R1.01', coef: 1 }, { code: 'SAÉ 1.01', coef: 2 }] },
        { code: 'UE1.3', title: 'Développer', color: '#feb40b', modules: [{ code: 'R1.02', coef: 2 }] },
      ],
      resources: [module],
      saes: [],
    },
  }
}

test('an evaluation\'s share of a UE: its coef × weight in the module, times the module\'s coefficient in the UE', () => {
  const partiel = evaluation('1', { coef: 2, weights: { 'UE1.1': 1, 'UE1.2': 1 } })
  const tp = evaluation('2', { coef: 1, weights: { 'UE1.1': 1 }, kind: 'pending' })
  const { report, module } = buildReport([partiel, tp])

  const shares = computeEvaluationShares(report, module, partiel)
  assert.deepEqual(shares.map((entry) => entry.ue), ['UE1.1', 'UE1.2'])
  // UE1.1: 2 / (2 + 1) of the module, the module 3 / 4 of the UE.
  assert.ok(Math.abs(shares[0].share - (2 / 3) * (3 / 4)) < 1e-9)
  // UE1.2: the only evaluation weighing there, the module 1 / 3 of the UE.
  assert.ok(Math.abs(shares[1].share - 1 / 3) < 1e-9)
})

test('excused evaluations drop out of the module\'s total; rattrapages and excused grades have no share', () => {
  const partiel = evaluation('1', { coef: 2, weights: { 'UE1.1': 1 } })
  const excused = evaluation('2', { coef: 2, weights: { 'UE1.1': 1 }, kind: 'excused' })
  const rattrapage = evaluation('3', { weights: { 'UE1.1': 1 }, typeLabel: 'Rattrapage' })
  const { report, module } = buildReport([partiel, excused, rattrapage])

  assert.ok(Math.abs(computeEvaluationShares(report, module, partiel)[0].share - 3 / 4) < 1e-9)
  assert.equal(computeEvaluationShares(report, module, excused)[0].share, null)
  assert.equal(computeEvaluationShares(report, module, rattrapage)[0].share, null)
})

test('shares read as whole percents, tiny ones as "< 1 %"', () => {
  assert.equal(formatShare(0.1234), '12 %')
  assert.equal(formatShare(0.004), '< 1 %')
  assert.equal(formatShare(null), null)
})

test('the gap to the promo mean is signed and spoken', () => {
  assert.equal(describeGapToMean(evaluation('1', { value: 15.5, promo: { moy: 12.7 } })).text, '+2.8 sur la moyenne')
  assert.equal(describeGapToMean(evaluation('1', { value: 10, promo: { moy: 10.5 } })).spoken, '0.5 point sous la moyenne de la promo')
  assert.equal(describeGapToMean(evaluation('1', { value: 12, promo: { moy: 12 } })).text, 'Pile la moyenne')
  assert.equal(describeGapToMean(evaluation('1', { kind: 'absent', promo: { moy: 12 } })), null)
})

test('a grade lands in its integer bar, 20 alone', () => {
  assert.equal(gradeBucket(13.99), 13)
  assert.equal(gradeBucket(14), 14)
  assert.equal(gradeBucket(19.75), 19)
  assert.equal(gradeBucket(20), 20)
  assert.equal(gradeBucket(Number.NaN), null)
  assert.equal(describeBucket(14).long, 'De 14 à moins de 15')
  assert.equal(describeBucket(20).long, '20/20')
})

test('distributions are checked before drawing', () => {
  const counts = Array.from({ length: 21 }, (_, index) => (index === 12 ? 3 : index === 14 ? 2 : 0))
  assert.deepEqual(readDistribution({ status: 'ok', counts, total: 5 }), { counts, total: 5 })
  assert.equal(readDistribution({ status: 'ok', counts: counts.slice(1), total: 5 }), null)
  assert.equal(readDistribution({ status: 'ok', counts: new Array(21).fill(0), total: 0 }), null)
  assert.equal(readDistribution({ status: 'unavailable' }), null)
})

test('the summary counts whole bars under, in and over the student\'s', () => {
  const counts = new Array(21).fill(0)
  counts[8] = 2
  counts[12] = 5
  counts[14] = 4
  counts[17] = 1
  assert.deepEqual(summarizeDistribution(counts, 14), { total: 12, mode: 12, below: 7, same: 4, above: 1 })
  assert.equal(summarizeDistribution(counts).below, null)
})

test('the demo relevé\'s evaluations are found and weigh something in their UEs', () => {
  const payload = buildDemoGradesPayload()
  const report = buildGradesReport(payload['relevé'], { config: payload.config })
  const module = report.resources[0]
  const found = findEvaluation(report, module.code, module.evaluations[0].id)
  assert.equal(found.evaluation, module.evaluations[0])
  assert.equal(findEvaluation(report, module.code, 'nope'), null)

  const normal = [...report.resources, ...report.saes]
    .flatMap((entry) => entry.evaluations.map((item) => ({ module: entry, evaluation: item })))
    .filter(({ evaluation: item }) => !item.typeLabel && item.grade.kind === 'number')
  for (const { module: entry, evaluation: item } of normal) {
    for (const share of computeEvaluationShares(report, entry, item)) {
      assert.ok(share.share > 0 && share.share <= 1, `${entry.code} ${item.id} ${share.ue}`)
    }
  }
})

test('the weights ring has every UE with credits, the grade\'s share in each, the top one leading', () => {
  const partiel = evaluation('1', { coef: 2, weights: { 'UE1.1': 1, 'UE1.2': 1 } })
  const { report, module } = buildReport([partiel])
  report.ues.push({ code: 'UE1.B', title: 'Bonus sport', color: null, ects: { total: 0 }, modules: [] })

  const ring = buildUeShareRing(report, module, partiel)
  assert.deepEqual(ring.ues.map((entry) => entry.ue), ['UE1.1', 'UE1.2', 'UE1.3'])
  assert.deepEqual(ring.ues.map((entry) => entry.weight), [1, 1, 0])
  assert.equal(ring.ues[2].share, 0)
  assert.equal(ring.top.ue, 'UE1.1')
  assert.ok(Math.abs(ring.top.share - 3 / 4) < 1e-9)
})

test('no weights ring when no share can be told', () => {
  const rattrapage = evaluation('1', { weights: { 'UE1.1': 1 }, typeLabel: 'Rattrapage' })
  const { report, module } = buildReport([rattrapage])
  assert.equal(buildUeShareRing(report, module, rattrapage), null)
})
