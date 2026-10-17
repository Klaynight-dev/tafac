// What the "Matières" list of "Mes notes" needs from buildGradesReport's
// modules, and the UE wash the grade cards share. Pure: no browser or
// @university import, so the tests run it straight in Node.

import { GRADE_SCALE, describeUeValidation } from './gradesReport.js'

// The colours of the UEs a grade (or a subject) counts for, left to right in
// proportion to its weight in each (ScoDoc's evaluation weights, or the
// module's UE coefficients), as one gradient. Null when none of its UEs has
// a colour.
export function buildUeWash(weights, ueColors) {
  const parts = (weights ?? [])
    .filter((entry) => entry.weight > 0 && ueColors[entry.ue])
    .map((entry) => ({ color: ueColors[entry.ue], weight: entry.weight }))
  if (parts.length === 0) return null
  if (parts.length === 1) return parts[0].color

  const total = parts.reduce((sum, part) => sum + part.weight, 0)
  let start = 0
  const stops = parts.map((part) => {
    // Each colour sits at the middle of its share, so they blend between.
    const middle = start + (part.weight / total) * 50
    start += (part.weight / total) * 100
    return `${part.color} ${middle.toFixed(1)}%`
  })
  return `linear-gradient(90deg, ${stops.join(', ')})`
}

// 16.666… → "16.67", 14 → "14": the pills' number, as on the cards above.
export function formatScore(value) {
  return String(parseFloat(value.toFixed(2)))
}

const MODULE_CODE_ORDER = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' })

// The semester's subjects in two groups, ressources then SAÉ, each in code
// order (R5.02, R5.04 … R5.11), the order of the programme and of ScoDoc's
// PDF: a student finds a subject where they expect it. Empty groups are left
// out.
export function listSubjectGroups(report) {
  return [
    { kind: 'resource', label: 'Ressources', modules: report?.resources ?? [] },
    { kind: 'sae', label: 'SAÉ', modules: report?.saes ?? [] },
  ]
    .filter((group) => group.modules.length > 0)
    .map((group) => ({
      ...group,
      modules: [...group.modules].sort((left, right) => MODULE_CODE_ORDER.compare(left.code, right.code)),
    }))
}

function countLabel(count, singular, plural) {
  return `${count} ${count > 1 ? plural : singular}`
}

// Under a subject's name: how far its evaluations are, e.g. "2 notes ·
// 1 absence · 1 en attente". An absence counts as 0 in ScoDoc's averages,
// so it's worth seeing without opening the subject.
export function describeSubjectProgress(module) {
  const evaluations = module?.evaluations ?? []
  if (evaluations.length === 0) return 'Aucune évaluation'

  const absent = evaluations.filter((evaluation) => evaluation.grade.kind === 'absent').length
  const parts = [
    module.gradedCount ? countLabel(module.gradedCount, 'note', 'notes') : null,
    absent ? countLabel(absent, 'absence', 'absences') : null,
    module.pendingCount ? `${module.pendingCount} en attente` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : 'Pas encore de note'
}

// A subject's evaluations in the order they happened; undated ones last,
// ScoDoc's order otherwise.
export function sortEvaluations(evaluations) {
  return (evaluations ?? [])
    .map((evaluation, index) => ({ evaluation, index }))
    .sort((left, right) => {
      const leftDate = left.evaluation.date ?? ''
      const rightDate = right.evaluation.date ?? ''
      if (leftDate && rightDate && leftDate !== rightDate) return leftDate.localeCompare(rightDate)
      if (Boolean(leftDate) !== Boolean(rightDate)) return leftDate ? -1 : 1
      return left.index - right.index
    })
    .map(({ evaluation }) => evaluation)
}

function toPercent(value) {
  return Math.min(100, Math.max(0, (value / GRADE_SCALE) * 100))
}

// Where a grade sits in its promo, as positions on a 0–20 bar (percent):
// the promo's spread from lowest to highest, its mean, and the student's
// grade. Null without a numeric grade or a spread to place it in.
export function placeInPromo(evaluation) {
  const { min, moy, max } = evaluation?.promo ?? {}
  const value = evaluation?.grade?.kind === 'number' ? evaluation.grade.value : null
  if (value == null || min == null || max == null || max < min) return null

  return {
    min: toPercent(min),
    max: toPercent(max),
    moy: moy != null ? toPercent(moy) : null,
    value: toPercent(value),
  }
}

// The "Par UE" view: one group per UE (in ScoDoc's order), with what the UE
// card shows: its average, its state on the same rule as the "UE validées"
// ring (describeUeValidation: 'validated' from 10/20, once capitalised or
// when the jury awarded it, by compensation or its own decision; 'below'
// under 10, 'pending' without an average) and what validated it, and the
// modules that feed it. Each module
// comes with its coefficient and its average *in this UE* (ScoDoc's own:
// the same subject can weigh differently in two UEs), sorted by coefficient
// so the biggest lever comes first, and only the evaluations that count for
// this UE, with their weight in it. UEs without a module are left out.
export function listUeGroups(report) {
  const modulesByCode = new Map([...(report?.resources ?? []), ...(report?.saes ?? [])].map((module) => [module.code, module]))

  return (report?.ues ?? [])
    .filter((ue) => (ue.modules ?? []).length > 0)
    .map((ue) => {
      const average = ue.average?.value ?? null
      const { state, validatedBy } = describeUeValidation(ue)
      const modules = ue.modules
        .map((link) => {
          const module = modulesByCode.get(link.code)
          const evaluations = sortEvaluations(module?.evaluations)
            .map((evaluation) => ({ evaluation, weight: evaluation.weights?.find((entry) => entry.ue === ue.code)?.weight ?? 0 }))
            .filter((entry) => entry.weight > 0)
          return {
            code: link.code,
            title: link.title ?? module?.title ?? link.code,
            kind: link.kind ?? module?.kind ?? null,
            coef: link.coef ?? null,
            average: link.average ?? null,
            evaluations,
            pendingCount: evaluations.filter((entry) => entry.evaluation.grade.kind === 'pending').length,
          }
        })
        .sort((left, right) => (right.coef ?? 0) - (left.coef ?? 0) || MODULE_CODE_ORDER.compare(left.code, right.code))

      // Bonus and malus are already in ScoDoc's average: carried to explain
      // it, never added. The rank is null when the department hides ranks.
      return {
        code: ue.code,
        title: ue.title,
        color: ue.color,
        average,
        state,
        validatedBy,
        // The jury's code for the UE once it has ruled (ADM, AJ…), or null.
        decision: ue.decision ?? null,
        ects: ue.ects,
        capitalized: Boolean(ue.capitalized),
        bonus: ue.bonus ?? null,
        malus: ue.malus ?? null,
        rank: ue.rank ?? null,
        modules,
      }
    })
}

// --- New grades ----------------------------------------------------------------
// What's new is told by evaluation ids only: the ids graded at the last visit
// are remembered, never the grades (a grade's value never reaches storage).
// So a grade that changes isn't "new", a grade that appears is.

// Ids of the semester's evaluations that have a grade, an absence included
// (it counts, as 0).
export function listGradedEvaluationIds(report) {
  return [...(report?.resources ?? []), ...(report?.saes ?? [])]
    .flatMap((module) => module.evaluations ?? [])
    .filter((evaluation) => evaluation.grade?.kind === 'number' || evaluation.grade?.kind === 'absent')
    .map((evaluation) => String(evaluation.id))
}

// The graded ids not seen at the last visit. A semester never visited has
// nothing new: everything would be, which says nothing.
export function findNewEvaluationIds(gradedIds, seenIds) {
  if (!Array.isArray(seenIds)) return new Set()
  const seen = new Set(seenIds.map(String))
  return new Set(gradedIds.filter((id) => !seen.has(id)))
}

// "UE5.1" → "UE 5.1", as on the UE ribbons' design.
export function formatUeCode(code) {
  return String(code).replace(/^UE\s*/i, 'UE ')
}

// --- Relevé details ------------------------------------------------------------

// A rank as "Rang 9 / 84" (ScoDoc's ex aequo kept: "Rang 12 / 45 ex æquo"),
// with its spoken form. Null without one: the department hides ranks.
export function formatRank(rank) {
  const value = String(rank?.value ?? '').trim()
  if (!value) return null
  const exAequo = /\s*ex æquo$/i.test(value)
  const position = value.replace(/\s*ex æquo$/i, '')
  const tie = exAequo ? ' ex æquo' : ''
  return {
    text: `Rang ${position}${rank.total ? `\u202F/\u202F${rank.total}` : ''}${tie}`,
    spoken: `Rang ${position}${rank.total ? ` sur ${rank.total}` : ''}${tie}`,
  }
}

// Points with their sign, a real minus: 0.25 → "+0.25", -0.5 → "−0.5".
export function formatSignedPoints(value) {
  return `${value < 0 ? '−' : '+'}${formatScore(Math.abs(value))}`
}

// The semester's group ranks, named: ScoDoc keys them by group id, so a bare
// id takes its name from the relevé's groups ("TD B"); one that can't be
// named is left out rather than shown as a number.
export function nameGroupRanks(groupRanks, groups) {
  const names = new Map((Array.isArray(groups) ? groups : [])
    .map((group) => [String(group?.id ?? group?.group_id ?? ''), String(group?.group_name ?? '').trim()])
    .filter(([id, name]) => id && name))
  return (groupRanks ?? [])
    .map((rank) => ({ ...rank, name: /^\d+$/.test(rank.name) ? names.get(rank.name) ?? null : rank.name }))
    .filter((rank) => rank.name)
}

const UPDATE_TIME = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const UPDATE_DAY = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })
const UPDATE_DAY_YEAR = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

// When ScoDoc produced the relevé (its `date`), beside the semester:
// "Mis à jour aujourd’hui à 14:32", "… hier à 09:05", "… le 3 oct. à 14:32"
// (the year when it isn't this one). A date without a time has no "à".
// Null when missing or unreadable: nothing is better than a wrong date.
export function formatReportUpdate(value, now = new Date()) {
  if (typeof value !== 'string' || !value.trim()) return null
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
  // Date-only strings are local days, not UTC midnight.
  const date = new Date(dateOnly ? `${value.trim()}T00:00:00` : value.trim())
  if (Number.isNaN(date.getTime())) return null

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)
  const day = days === 0 ? 'aujourd’hui'
    : days === 1 ? 'hier'
      : `le ${(date.getFullYear() === now.getFullYear() ? UPDATE_DAY : UPDATE_DAY_YEAR).format(date)}`
  return `Mis à jour ${day}${dateOnly ? '' : ` à ${UPDATE_TIME.format(date)}`}`
}

// A grade's day on its card: "14 oct.". Null if the date can't be read.
const GRADE_DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function formatGradeDay(date) {
  const time = Date.parse(date)
  return Number.isFinite(time) ? GRADE_DAY_FORMAT.format(time) : null
}
