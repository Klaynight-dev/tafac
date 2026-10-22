// The planning (ADE) group of a student whose planning account was never
// set up (no group of its own, so nothing to start the onboarding from):
// found from their ScoDoc group instead. Pure, see tests/adeGroupMatch.test.js.

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

// Among ADE search results ({ id, name, path }, path dot-separated from
// "Ressources"), the one student group named `alias`, or starting with it
// ("3B3" → "3B3 MMI", "2B2" → "2B2-Dev MMI"). Several of them (another
// programme's "3B3"): the one under the student's programme
// (`programHints`, e.g. ScoDoc's "BUT MMI"). Null unless exactly one.
export function pickAdeGroupForAlias(results, alias, programHints = []) {
  const wanted = normalize(alias)
  if (!wanted) {
    return null
  }

  const matches = (Array.isArray(results) ? results : []).filter((result) => {
    const segments = String(result?.path ?? '').split('.').map(normalize)
    if (!segments.includes('etudiants')) {
      return false
    }

    const name = normalize(result?.name)
    return name === wanted || name.split(/[\s-]/)[0] === wanted
  })

  if (matches.length <= 1) {
    return matches[0] ?? null
  }

  const hints = programHints.map(normalize).filter(Boolean)
  const narrowed = matches.filter((result) => String(result.path ?? '').split('.').map(normalize)
    .some((segment) => hints.some((hint) => segment.includes(hint))))
  return narrowed.length === 1 ? narrowed[0] : null
}
