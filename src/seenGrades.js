// Per viewer and browser: the ids of the evaluations already graded when
// "Mes notes" last showed a semester, to flag the new ones next time (see
// findNewEvaluationIds). Ids only, never a grade. Scoped to the signed-in
// user, so a shared browser doesn't mix students. A convenience: unreadable
// storage just means no "Nouveau" badge.
const SEEN_GRADES_KEY = 'l-ent:grades-seen-ids'

function readStore(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(SEEN_GRADES_KEY) || 'null')
    return stored && stored.user === (user ?? null) && stored.semesters && typeof stored.semesters === 'object' ? stored.semesters : {}
  } catch {
    return {}
  }
}

export function readSeenEvaluationIds(user, semesterId) {
  const ids = readStore(user)[semesterId]
  return Array.isArray(ids) ? ids : null
}

export function writeSeenEvaluationIds(user, semesterId, ids) {
  try {
    const semesters = { ...readStore(user), [semesterId]: ids }
    localStorage.setItem(SEEN_GRADES_KEY, JSON.stringify({ user: user ?? null, semesters }))
  } catch {
    // Storage full or unavailable: no badge next time, nothing worse.
  }
}
