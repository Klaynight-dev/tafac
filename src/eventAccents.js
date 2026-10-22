// The courses' colours, as the iOS app gives them (EventAccents): nine
// accents handed out in the order the courses are first seen (not hashed,
// not ADE's colour), worn as the site wears a subject's colour (a wash over
// the card, an accent bar). Pure, see tests/planningPage.test.js.

// In handing-out order. The first is the ENT's blue, a little brighter on
// the dark theme; the others are the same on both.
export const ACCENTS = ['#0095D6', '#E84646', '#00B3A4', '#8F52D8', '#F2A600', '#4E5FE2', '#3CB53A', '#E04A9D', '#F06A22']
const FIRST_ACCENT_DARK = '#1CA4E6'

// One course, however its title is spaced or capitalised.
export function courseKey(title) {
  return String(title ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR')
}

// Course key → accent index, extended as new courses come: the first unseen
// course gets the next accent, round and round once all nine are taken.
// `assigned` is kept by the caller (localStorage) so a course keeps its
// colour between visits.
export function assignAccent(assigned, title) {
  const key = courseKey(title)
  if (Number.isInteger(assigned[key])) return { assigned, index: assigned[key] }
  const index = Object.keys(assigned).length % ACCENTS.length
  return { assigned: { ...assigned, [key]: index }, index }
}

export function accentColor(index, dark = false) {
  return index === 0 && dark ? FIRST_ACCENT_DARK : ACCENTS[index % ACCENTS.length]
}

// A course's colour as CSS variables, both themes (the planning's blocks
// and sheet pick the dark one under [data-theme="dark"], .planning-accent-fill).
export function accentStyle(index) {
  return { '--accent': accentColor(index), '--accent-dark': accentColor(index, true) }
}
