import { getEvaluationDistribution } from './entApi'
import { readDistribution } from './gradeDetail'

// The promo's grades for one evaluation, for the grade detail's histogram:
// { status: 'ok', counts, total } or { status: 'unavailable' | 'error',
// reason }. entApi's answer, checked once more (21 bars, at least one
// grade) so the chart never draws a malformed one. No cache here: entApi's
// own is cleared with the account (clearGradesCache).
export async function loadEvaluationDistribution({ semesterId, evaluationId }) {
  try {
    const result = await getEvaluationDistribution({ semesterId, evaluationId })
    const distribution = readDistribution(result)
    if (distribution) return { status: 'ok', ...distribution }
    if (result?.status === 'error') return { status: 'error', reason: result.reason ?? null }
    return { status: 'unavailable', reason: result?.status === 'ok' ? 'too-few' : result?.reason ?? null }
  } catch {
    return { status: 'error', reason: null }
  }
}
