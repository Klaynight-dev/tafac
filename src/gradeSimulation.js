import { GRADE_SCALE, parseGradeNumber } from './gradesReport.js'

// The "Simuler" sheet of Mes notes. Its maths is gradesReport.js's
// projectAverages (Klaynight's PR #11); nothing typed is ever stored.

// Whether the semester has one evaluation a simulated grade would move.
export function hasSimulatableEvaluation(report) {
  return [...(report?.resources ?? []), ...(report?.saes ?? [])]
    .some((module) => (module.evaluations ?? []).some((evaluation) => evaluation.canSimulate))
}

// What a grade field holds: nothing (back to the real grade), a grade on
// /20, or something that isn't one yet. A French comma is fine, and so is a
// separator still waiting for its decimals ("12,").
export function readSimulatedGrade(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { kind: 'empty' }
  const value = parseGradeNumber(trimmed.replace(/[.,]$/, ''))
  return value != null && value >= 0 && value <= GRADE_SCALE
    ? { kind: 'grade', value }
    : { kind: 'invalid' }
}

// An average while simulating: the value to show, and whether it moved from
// the official one (under half a hundredth doesn't count). `delta` when
// both exist.
export function describeMove(official, projected) {
  const value = projected ?? official ?? null
  const changed = projected != null && (official == null || Math.abs(projected - official) >= 0.005)
  return { value, official: official ?? null, changed, delta: changed && official != null ? projected - official : null }
}

const byDate = (left, right) => (left.date ?? '\uffff').localeCompare(right.date ?? '\uffff')

// The ressources and SAÉ of one UE, in the relevé's order, each with its
// coefficient and average in that UE and the evaluations that count for it
// (oldest first, those without a date last).
export function listUeSubjects(report, ueCode) {
  const ue = (report?.ues ?? []).find((entry) => entry.code === ueCode)
  const modules = new Map([...(report?.resources ?? []), ...(report?.saes ?? [])].map((module) => [module.code, module]))
  return (ue?.modules ?? [])
    .filter((link) => link.coef == null || link.coef > 0)
    .map((link) => {
      const module = modules.get(link.code)
      return {
        code: link.code,
        title: module?.title ?? link.title,
        kind: link.kind,
        coef: link.coef,
        average: link.average,
        evaluations: (module?.evaluations ?? [])
          .filter((evaluation) => evaluation.weights.some((entry) => entry.ue === ueCode))
          .sort(byDate),
      }
    })
}

// --- The reveal (the simulator's last step) ----------------------------------

// A UE is validated from 10 (see semesterUes.js).
const PASS_MARK = 10

// What the simulated grades do to a UE, for the reveal: describeMove, plus
// whether the UE is validated before and after, how far it is from 10 when
// it isn't, and the `tone` the reveal takes:
// - 'crossed': now validated, it wasn't (or had no average yet);
// - 'up': goes up, validated either way;
// - 'closer': goes up, still under 10;
// - 'down': goes down, still validated;
// - 'dropped': goes down under 10;
// - 'short': under 10, down or without an average before;
// - 'same': doesn't move.
// A capitalised UE (or one compensated or validated by the jury: the
// `capitalized` option) stays validated whatever its average.
export function describeUeOutcome(official, projected, { capitalized = false } = {}) {
  const move = describeMove(official, projected)
  const wasValidated = capitalized || (official != null && official >= PASS_MARK)
  const validated = capitalized || (move.value != null && move.value >= PASS_MARK)
  const missing = !validated && move.value != null ? PASS_MARK - move.value : null
  let tone = 'same'
  if (move.changed) {
    if (validated && !wasValidated) tone = 'crossed'
    else if (move.delta == null) tone = validated ? 'up' : 'short'
    else if (move.delta > 0) tone = validated ? 'up' : 'closer'
    else if (validated) tone = 'down'
    else tone = wasValidated ? 'dropped' : 'short'
  }
  return { ...move, wasValidated, validated, missing, tone }
}

// A change in points, signed ("+0.78", "−1.5"), as the app writes grades.
export function formatDelta(delta) {
  if (delta == null) return null
  const text = String(parseFloat(Math.abs(delta).toFixed(2)))
  return `${delta < 0 ? '−' : '+'}${text}`
}

const SPOKEN_NUMBER = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

function spokenAverage(value) {
  return value != null ? `${SPOKEN_NUMBER.format(value)} sur 20` : 'pas de moyenne'
}

function spokenMove(move) {
  if (!move.changed || move.official == null) return spokenAverage(move.value)
  return `${spokenAverage(move.value)} au lieu de ${SPOKEN_NUMBER.format(move.official)}`
}

// The reveal read out, in plain French: the UE (`ue`, describeUeOutcome),
// the general average (`general`, describeMove) and the other UEs that move
// (`others`: { label, move }).
export function speakOutcome({ ue, general = null, others = [] }) {
  const parts = [`Moyenne de l’UE : ${spokenMove(ue)}, ${ue.validated ? 'UE validée' : 'UE pas encore validée'}.`]
  if (general?.value != null) parts.push(`Moyenne générale : ${spokenMove(general)}.`)
  for (const other of others) parts.push(`${other.label} : ${spokenMove(other.move)}.`)
  return parts.join(' ')
}

// The springs of overrides.css (--dial-spring…) are damped springs written
// as CSS linear(): read back as their points, the reveal moves its numbers
// on the very same curve. Null when it isn't one.
export function parseLinearEasing(text) {
  const match = /^\s*linear\((.*)\)\s*$/.exec(String(text ?? ''))
  if (!match) return null
  const points = match[1].split(',').map((entry) => Number.parseFloat(entry))
  return points.length >= 2 && points.every(Number.isFinite) ? points : null
}

// Such a curve at `progress` (0 → 1), its points evenly spaced.
export function sampleEasing(points, progress) {
  const clamped = Math.min(1, Math.max(0, progress))
  const position = clamped * (points.length - 1)
  const index = Math.min(points.length - 2, Math.floor(position))
  return points[index] + (points[index + 1] - points[index]) * (position - index)
}

// Grades added by hand in the simulator (`customs`: subject code → [{ id,
// coef }]), as evaluations of their ressource or SAÉ, so Klaynight's maths
// counts them like the others: a normal evaluation, its coefficient, a
// weight of 1 toward every UE the subject counts for (ScoDoc's default),
// and no grade yet (the grade itself goes in the overrides, by its id). The
// relevé is copied where it changes, never touched.
export function addCustomEvaluations(releve, customs) {
  const entries = Object.entries(customs ?? {}).filter(([, list]) => list?.length)
  if (!releve || !entries.length) return releve
  const next = { ...releve, ressources: { ...releve.ressources }, saes: { ...releve.saes } }
  for (const [code, list] of entries) {
    const sectionKey = releve.saes?.[code] ? 'saes' : releve.ressources?.[code] ? 'ressources' : null
    if (!sectionKey) continue
    const poids = {}
    for (const [ueCode, ue] of Object.entries(releve.ues ?? {})) {
      if (parseGradeNumber(ue?.[sectionKey]?.[code]?.coef) > 0) poids[ueCode] = 1
    }
    const module = next[sectionKey][code]
    next[sectionKey][code] = {
      ...module,
      evaluations: [
        ...(module.evaluations ?? []),
        ...list.map((custom) => ({ id: custom.id, evaluation_type: 0, coef: custom.coef, poids, note: { value: '~' } })),
      ],
    }
  }
  return next
}
