import { buildGradesReport, describeUeValidation } from './gradesReport.js'

// The semester's UEs for the UE rings ("UE validées" card, the simulator):
// each with its state, 'validated', 'below' or 'pending' (no average yet),
// and what validated it (`validatedBy`: its average, a capitalisation, a
// compensation or the jury; see describeUeValidation). Bonus-only UEs (no
// ECTS) are left out.
// When ScoDoc sends no colour for a UE.
const FALLBACK_COLOR = '#341200'

export function readSemesterUes(releve, config) {
  // A relevé the parser doesn't read (not BUT) has no UEs.
  if (!releve) return []
  return (buildGradesReport(releve, { config }).ues ?? [])
    .filter((ue) => ue.ects?.total == null || ue.ects.total > 0)
    .map((ue) => {
      const { state, validatedBy } = describeUeValidation(ue)
      return { code: ue.code, title: ue.title, color: ue.color ?? FALLBACK_COLOR, average: ue.average?.value ?? null, state, validatedBy }
    })
}
