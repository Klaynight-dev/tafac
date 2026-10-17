// What the grade detail sheet (GradeDetailModal) reads from
// buildGradesReport's report: where an evaluation sits, what it weighs in
// each UE, and how the promo's grades spread. Pure: no browser or
// @university import, so the tests run it straight in Node.

import { bucketOfGrade } from './gradesReport.js'
import { formatScore } from './gradesSubjects.js'

export const BUCKET_COUNT = 21

// A grade's bar on the 0–20 histogram: the rule the counts were binned
// with, so the highlighted bar is the one the grade was counted in.
export function gradeBucket(value) {
  return Number.isFinite(value) ? bucketOfGrade(value) : null
}

// The evaluation and its module, from a module code and an evaluation id
// (ScoDoc ids are only unique within a semester, the module narrows it).
export function findEvaluation(report, moduleCode, evaluationId) {
  const modules = [...(report?.resources ?? []), ...(report?.saes ?? [])]
  const id = String(evaluationId)
  const candidates = moduleCode != null ? modules.filter((module) => module.code === moduleCode) : modules
  for (const module of candidates) {
    const evaluation = module.evaluations.find((entry) => String(entry.id) === id)
    if (evaluation) return { module, evaluation }
  }
  return null
}

// The evaluation's part of each UE average it counts for, ScoDoc's BUT rule
// unrolled: inside the module, coef × weight over the module's normal
// evaluations with a weight in that UE; then the module's coefficient over
// the UE's. Pending evaluations are counted (the share is the one it will
// have once all are in), excused ones aren't (ScoDoc neutralises them).
// `share` is null when it can't be told (a rattrapage replaces a grade
// rather than adding to it, an excused grade counts for nothing).
export function computeEvaluationShares(report, module, evaluation) {
  const weights = evaluation?.weights ?? []
  const isCounted = !evaluation?.typeLabel && evaluation?.grade?.kind !== 'excused'

  return (report?.ues ?? [])
    .map((ue) => {
      const weight = weights.find((entry) => entry.ue === ue.code)?.weight ?? 0
      if (weight <= 0) return null
      return { ue: ue.code, title: ue.title, color: ue.color, weight, share: isCounted ? shareInUe(ue, module, evaluation, weight) : null }
    })
    .filter(Boolean)
}

function shareInUe(ue, module, evaluation, weight) {
  const moduleCoef = ue.modules?.find((link) => link.code === module?.code)?.coef ?? 0
  const ueCoefs = (ue.modules ?? []).reduce((sum, link) => sum + (link.coef > 0 ? link.coef : 0), 0)
  if (moduleCoef <= 0 || ueCoefs <= 0) return null

  const part = (entry) => {
    if (entry.typeLabel || entry.grade?.kind === 'excused') return 0
    const entryWeight = entry.weights?.find((link) => link.ue === ue.code)?.weight ?? 0
    return (entry.coef ?? 1) * entryWeight
  }
  const moduleTotal = (module?.evaluations ?? []).reduce((sum, entry) => sum + part(entry), 0)
  const own = (evaluation.coef ?? 1) * weight
  if (moduleTotal <= 0 || own <= 0) return null
  return (own / moduleTotal) * (moduleCoef / ueCoefs)
}

// The ring of the weights card: the semester's UEs as the "UE validées"
// ring shows them (same order, bonus-only UEs left out), each with the
// evaluation's weight and share there (0 where it doesn't count). The top
// share leads the ring's centre. Null when no share can be told
// (rattrapage, excused grade): the text rows say it alone.
export function buildUeShareRing(report, module, evaluation) {
  const shares = new Map(computeEvaluationShares(report, module, evaluation).map((entry) => [entry.ue, entry]))
  const ues = (report?.ues ?? [])
    .filter((ue) => ue.ects?.total == null || ue.ects.total > 0)
    .map((ue) => {
      const entry = shares.get(ue.code)
      return { ue: ue.code, title: ue.title, color: ue.color, weight: entry?.weight ?? 0, share: entry ? entry.share : 0 }
    })
  if (!ues.some((entry) => entry.share > 0)) return null
  const top = ues.reduce((best, entry) => (entry.share > (best?.share ?? 0) ? entry : best), null)
  return { ues, top }
}

// 0.1234 → "12 %", 0.004 → "< 1 %" (a narrow no-break space, French style).
export function formatShare(share) {
  if (share == null || !Number.isFinite(share)) return null
  const percent = Math.round(share * 100)
  return percent < 1 ? '<\u202f1\u202f%' : `${percent}\u202f%`
}

// The grade against the promo's mean: its signed gap, and how to say it.
export function describeGapToMean(evaluation) {
  const value = evaluation?.grade?.kind === 'number' ? evaluation.grade.value : null
  const mean = evaluation?.promo?.moy
  if (value == null || mean == null) return null
  const gap = Math.round((value - mean) * 100) / 100
  if (gap === 0) return { gap, text: 'Pile la moyenne', spoken: 'pile la moyenne de la promo' }
  const points = formatScore(Math.abs(gap))
  const unit = Math.abs(gap) >= 2 ? 'points' : 'point'
  return gap > 0
    ? { gap, text: `+${points} sur la moyenne`, spoken: `${points} ${unit} au-dessus de la moyenne de la promo` }
    : { gap, text: `−${points} sous la moyenne`, spoken: `${points} ${unit} sous la moyenne de la promo` }
}

// A histogram bar's range, written and spoken: "14 à 15" covers 14 up to
// (not including) 15; the last bar is 20 alone.
export function describeBucket(index) {
  if (index >= BUCKET_COUNT - 1) return { short: '20', long: '20/20', spoken: 'pile 20' }
  return { short: String(index), long: `De ${index} à moins de ${index + 1}`, spoken: `de ${index} à moins de ${index + 1}` }
}

export function countLabel(count) {
  return `${count} ${count > 1 ? 'étudiants' : 'étudiant'}`
}

// The histogram's counts, checked: 21 non-negative integers, else null.
export function readDistribution(result) {
  if (result?.status !== 'ok' || !Array.isArray(result.counts) || result.counts.length !== BUCKET_COUNT) return null
  const counts = result.counts.map((count) => (Number.isFinite(count) && count > 0 ? Math.round(count) : 0))
  const sum = counts.reduce((total, count) => total + count, 0)
  if (sum === 0) return null
  const total = Number.isFinite(result.total) && result.total >= sum ? result.total : sum
  return { counts, total }
}

// What the histogram says, for its caption and screen readers: how many
// grades sit under, in and over the student's bar (exact: whole bars), and
// the most common bar.
export function summarizeDistribution(counts, studentBucket = null) {
  const total = counts.reduce((sum, count) => sum + count, 0)
  let mode = 0
  counts.forEach((count, index) => {
    if (count > counts[mode]) mode = index
  })
  if (studentBucket == null || studentBucket < 0 || studentBucket >= counts.length) {
    return { total, mode, below: null, same: null, above: null }
  }
  const below = counts.slice(0, studentBucket).reduce((sum, count) => sum + count, 0)
  const above = counts.slice(studentBucket + 1).reduce((sum, count) => sum + count, 0)
  return { total, mode, below, same: counts[studentBucket], above }
}
