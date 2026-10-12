// App search ("Toutes les applications" and the favorites highlight).
// Accents and case are ignored and words match from their start, in the
// title, the description and the category, plus synonyms students type
// ("mail" finds Messagerie, "cours" finds Moodle). Title matches rank first.
// Pure, see tests/appSearch.test.js.

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Words that mean the same kind of app: an app whose text contains one of
// them (as whole words) also answers to the others.
const SYNONYM_GROUPS = [
  ['messagerie', 'mail', 'mails', 'email', 'courriel', 'webmail', 'zimbra', 'outlook', 'boite mail'],
  ['moodle', 'cours', 'foad', 'elearning', 'devoirs'],
  ['emploi du temps', 'emplois du temps', 'edt', 'planning', 'agenda', 'calendrier', 'horaires', 'ade'],
  ['notes', 'resultats', 'bulletin', 'releve', 'moyenne', 'scodoc'],
  ['webconference', 'visio', 'visioconference', 'zoom', 'teams', 'reunion'],
  ['microsoft', 'office', 'word', 'excel', 'powerpoint', 'onedrive'],
  ['annuaire', 'contacts', 'contact', 'enseignants', 'profs', 'telephone'],
  ['assistance', 'aide', 'support', 'ticket', 'probleme'],
  ['documentation', 'tutoriel', 'tuto', 'guide'],
  ['bibliotheque', 'bu', 'livres'],
  ['loxya', 'pret', 'materiel', 'location', 'reservation'],
  ['wifi', 'eduroam', 'reseau', 'internet'],
  ['impression', 'imprimer', 'imprimante'],
].map((group) => group.map(normalizeSearchText))

function containsPhrase(text, phrase) {
  return ` ${text} `.includes(` ${phrase} `)
}

function hasWordStartingWith(text, token) {
  return ` ${text}`.includes(` ${token}`)
}

function getSynonyms(text) {
  return SYNONYM_GROUPS
    .filter((group) => group.some((phrase) => containsPhrase(text, phrase)))
    .flat()
    .join(' ')
}

// 0 = no match. Higher is better: the title starts with the query, every
// word found at the start of a title word, found in the description,
// category or synonyms, and last a plain piece of the title ("soft").
export function scoreAppSearch(app, query) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return 1

  const title = normalizeSearchText(app?.title || app?.name)
  const tokens = normalizedQuery.split(' ')

  if (title.startsWith(normalizedQuery)) return 4
  if (tokens.every((token) => hasWordStartingWith(title, token))) return 3

  const details = normalizeSearchText(`${app?.description ?? ''} ${app?.category ?? ''}`)
  const haystack = `${title} ${details} ${getSynonyms(`${title} ${details}`)}`
  if (tokens.every((token) => hasWordStartingWith(haystack, token))) return 2

  return title.includes(normalizedQuery) ? 1 : 0
}

// Matching apps, best first; equal scores keep their list order.
export function searchApps(apps, query) {
  if (!normalizeSearchText(query)) return apps

  return apps
    .map((app, index) => ({ app, index, score: scoreAppSearch(app, query) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ app }) => app)
}
