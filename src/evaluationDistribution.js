// Distribution of a promo's grades for one evaluation, the histogram the
// notes9 passerelle shows when a grade is clicked. Pure data (no browser or
// @university import): the server, the demo account and the page share it.
//
// The passerelle (Scodoc_Notes, "Passerelle ScoDoc"):
// - data.php?q=listeNotes&eval=<evaluation id> answers ScoDoc's
//   /api/evaluation/<id>/notes as a flat list of every float grade scaled to
//   /20 (value / note_max × 20), in no particular order and without names;
//   ABS/EXC/pending grades are not floats and are left out.
// - Fewer than 6 grades answer ['too low'] (too few to stay anonymous).
// - With its global `histogramme` option off: { erreur: "L'histogramme n'est
//   pas activé" }. The option is also sent to the page in config.histogramme.
// - The page puts each grade in bucket Math.floor(grade), 21 buckets 0…20,
//   and highlights the student's own bucket, parseInt(note.value).

export const GRADE_BUCKET_COUNT = 21
// Below this, the passerelle answers 'too low' instead of the grades.
export const MIN_DISTRIBUTION_SIZE = 6
// A promo is a few hundred students at most; anything longer isn't a promo.
const MAX_DISTRIBUTION_SIZE = 5000
// Grades scaled to /20 by a division can land a hair under the integer
// (13.999999999999998 for 14): count those in the bucket they mean.
const FLOAT_EPSILON = 1e-9

// The histogram bar a grade (/20) falls in: its integer part, 20 for 20/20.
// Out-of-scale grades go to the end bars; null for anything not a number.
export function bucketOfGrade(value) {
  const grade = typeof value === 'string' && value.trim() ? Number(value.replace(',', '.')) : value
  if (typeof grade !== 'number' || !Number.isFinite(grade)) {
    return null
  }

  return Math.min(GRADE_BUCKET_COUNT - 1, Math.max(0, Math.floor(grade + FLOAT_EPSILON)))
}

function unavailable(reason) {
  return { status: 'unavailable', reason }
}

// Grades (/20) → { status: 'ok', counts[21], total, bins: 'integer' }, or
// 'too-few' under the passerelle's anonymity threshold.
export function buildDistribution(grades) {
  const counts = new Array(GRADE_BUCKET_COUNT).fill(0)
  let total = 0

  for (const grade of grades) {
    const bucket = bucketOfGrade(grade)
    if (bucket != null) {
      counts[bucket] += 1
      total += 1
    }
  }

  return total < MIN_DISTRIBUTION_SIZE
    ? unavailable('too-few')
    : { status: 'ok', counts, total, bins: 'integer' }
}

// The passerelle's listeNotes answer → a distribution, an 'unavailable'
// reason, or null when it isn't a listeNotes answer at all.
export function normalizeDistributionAnswer(payload) {
  if (Array.isArray(payload)) {
    if (payload[0] === 'too low') {
      return unavailable('too-few')
    }
    if (payload.length > MAX_DISTRIBUTION_SIZE || !payload.every((grade) => typeof grade === 'number' && Number.isFinite(grade))) {
      return null
    }
    return buildDistribution(payload)
  }

  if (typeof payload?.erreur === 'string' && /histogramme/i.test(payload.erreur)) {
    return unavailable('disabled')
  }

  return null
}

// A distribution as relayed by the server, checked again on the way in:
// { counts[21], total } with total = Σ counts, or null.
export function readDistributionCounts(data) {
  const counts = data?.counts
  if (!Array.isArray(counts) || counts.length !== GRADE_BUCKET_COUNT
    || !counts.every((count) => Number.isInteger(count) && count >= 0)) {
    return null
  }

  const total = counts.reduce((sum, count) => sum + count, 0)
  return total === data.total && total > 0 ? { counts: [...counts], total } : null
}

// The raw evaluation `evaluationId` of a relevé (ressources and SAÉs), or null.
export function findReleveEvaluation(releve, evaluationId) {
  const id = String(evaluationId)
  for (const sectionKey of ['ressources', 'saes']) {
    for (const module of Object.values(releve?.[sectionKey] ?? {})) {
      const found = (Array.isArray(module?.evaluations) ? module.evaluations : [])
        .find((evaluation) => evaluation?.id != null && String(evaluation.id) === id)
      if (found) {
        return found
      }
    }
  }
  return null
}

// --- Demo account ----------------------------------------------------------

// FNV-1a, to seed the generator from an evaluation id.
function hashSeed(seed) {
  let hash = 0x811c9dc5
  for (const char of String(seed)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

// mulberry32: tiny, seedable, good enough for made-up grades.
export function createSeededRandom(seed) {
  let state = hashSeed(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GRADE_STEP = 0.25

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

// `total` made-up grades (/20, quarter points) matching an evaluation's promo
// stats: min and max are both reached, the mean is `moy` (to a quarter point
// over the promo) and the student's own `grade` is one of them. Same seed,
// same grades, so a demo histogram never changes between two clicks.
export function generateDemoGrades({ seed, total, min, moy, max, grade = null }) {
  if (![total, min, moy, max].every(Number.isFinite) || total < 2 || min > max) {
    return []
  }

  const random = createSeededRandom(seed)
  const clamp = (value) => Math.min(max, Math.max(min, value))
  const fixed = [min, max]
  if (Number.isFinite(grade) && total > 2) {
    fixed.push(clamp(grade))
  }

  // Bell-shaped around the promo mean, redrawn when it falls off the range.
  const spread = (max - min) / 4.5
  const normal = () => Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random())
  const free = []
  while (fixed.length + free.length < Math.floor(total)) {
    let value = null
    for (let tries = 0; tries < 8 && value == null; tries += 1) {
      const candidate = moy + spread * normal()
      if (candidate >= min && candidate <= max) value = candidate
    }
    free.push(clamp(Math.round((value ?? min + random() * (max - min)) / GRADE_STEP) * GRADE_STEP))
  }

  // Nudge the free grades a quarter point at a time until the mean is `moy`.
  let missing = moy * (fixed.length + free.length) - sum(fixed) - sum(free)
  for (let index = 0, budget = free.length * 200; free.length > 0 && Math.abs(missing) >= GRADE_STEP / 2 && budget > 0; budget -= 1) {
    const step = missing > 0 ? GRADE_STEP : -GRADE_STEP
    const next = free[index] + step
    if (next >= min && next <= max) {
      free[index] = next
      missing -= step
    }
    index = (index + 1) % free.length
  }

  return [...fixed, ...free]
}
