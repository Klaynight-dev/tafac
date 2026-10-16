// Icons for the subjects (modules) of "Mes notes", drawn from the icon set
// the university picked for its application tiles (appIcons.style in its
// shared.js, see server/appIcons.js). Pure: no browser or @university import,
// so the tests can load it.

// Concept → [carbon, phosphor, tabler] icon, like the tiles' table. Every
// icon was checked on Iconify (Phosphor's -fill and -duotone weights too).
const SUBJECT_ICONS = {
  ux: ['carbon:touch-1', 'ph:hand-tap', 'tabler:hand-click'],
  accessibility: ['carbon:accessibility', 'ph:wheelchair', 'tabler:accessible'],
  writing: ['carbon:pen', 'ph:pen-nib', 'tabler:writing'],
  journalism: ['carbon:catalog', 'ph:newspaper', 'tabler:news'],
  communication: ['carbon:chat', 'ph:chats', 'tabler:messages'],
  languages: ['carbon:translate', 'ph:translate', 'tabler:language'],
  math: ['carbon:function-math', 'ph:function', 'tabler:math-function'],
  statistics: ['carbon:chart-histogram', 'ph:chart-bar', 'tabler:chart-histogram'],
  ai: ['carbon:machine-learning-model', 'ph:brain', 'tabler:brain'],
  security: ['carbon:security', 'ph:shield-check', 'tabler:shield-lock'],
  database: ['carbon:data-base', 'ph:database', 'tabler:database'],
  data: ['carbon:analytics', 'ph:chart-line', 'tabler:chart-line'],
  network: ['carbon:network-3', 'ph:share-network', 'tabler:network'],
  system: ['carbon:terminal', 'ph:terminal-window', 'tabler:terminal-2'],
  mobile: ['carbon:mobile', 'ph:device-mobile', 'tabler:device-mobile'],
  game: ['carbon:game-console', 'ph:game-controller', 'tabler:device-gamepad-2'],
  modeling: ['carbon:cube', 'ph:cube', 'tabler:3d-cube-sphere'],
  web: ['carbon:html', 'ph:browser', 'tabler:browser'],
  code: ['carbon:code', 'ph:code', 'tabler:code'],
  interface: ['carbon:template', 'ph:layout', 'tabler:layout'],
  design: ['carbon:color-palette', 'ph:palette', 'tabler:palette'],
  video: ['carbon:video', 'ph:film-strip', 'tabler:movie'],
  photo: ['carbon:camera', 'ph:camera', 'tabler:camera'],
  audio: ['carbon:microphone', 'ph:microphone', 'tabler:microphone'],
  culture: ['carbon:theater', 'ph:mask-happy', 'tabler:masks-theater'],
  history: ['carbon:hourglass', 'ph:hourglass', 'tabler:hourglass'],
  law: ['carbon:scales', 'ph:scales', 'tabler:scale'],
  economics: ['carbon:currency', 'ph:coins', 'tabler:coins'],
  marketing: ['carbon:chart-line-data', 'ph:target', 'tabler:target'],
  management: ['carbon:group', 'ph:users', 'tabler:users'],
  portfolio: ['carbon:portfolio', 'ph:briefcase', 'tabler:briefcase'],
  project: ['carbon:roadmap', 'ph:kanban', 'tabler:layout-kanban'],
  entrepreneurship: ['carbon:rocket', 'ph:rocket-launch', 'tabler:rocket'],
  company: ['carbon:building', 'ph:buildings', 'tabler:building'],
  society: ['carbon:user-multiple', 'ph:users-three', 'tabler:users-group'],
  physics: ['carbon:lightning', 'ph:atom', 'tabler:atom'],
  chemistry: ['carbon:chemistry', 'ph:flask', 'tabler:flask'],
  biology: ['carbon:dna', 'ph:dna', 'tabler:dna'],
  electronics: ['carbon:chip', 'ph:cpu', 'tabler:cpu'],
  search: ['carbon:search', 'ph:magnifying-glass', 'tabler:search'],
  sport: ['carbon:basketball', 'ph:barbell', 'tabler:barbell'],
  // Fallbacks, in this order, for subjects no rule (or only taken ones) matches.
  book: ['carbon:book', 'ph:book-open', 'tabler:book'],
  notebook: ['carbon:notebook', 'ph:notebook', 'tabler:notebook'],
  idea: ['carbon:idea', 'ph:lightbulb', 'tabler:bulb'],
  puzzle: ['carbon:category', 'ph:puzzle-piece', 'tabler:puzzle'],
  star: ['carbon:star', 'ph:star', 'tabler:star'],
  compass: ['carbon:compass', 'ph:compass', 'tabler:compass'],
  flag: ['carbon:flag', 'ph:flag', 'tabler:flag'],
  sparkle: ['carbon:magic-wand', 'ph:sparkle', 'tabler:sparkles'],
  bookmark: ['carbon:bookmark', 'ph:bookmark-simple', 'tabler:bookmark'],
  plant: ['carbon:sprout', 'ph:plant', 'tabler:plant'],
}

const FALLBACK_CONCEPTS = ['book', 'notebook', 'idea', 'puzzle', 'star', 'compass', 'flag', 'sparkle', 'bookmark', 'plant']

// Keyword → concept, the specific before the broad ("ux " before "web",
// "web" before "developpement"). As for the tiles, keywords match the start
// of a word, accents and case ignored, and a trailing space requires the word
// to end there ("ia " is not « iam »).
export const SUBJECT_ICON_RULES = [
  { concept: 'ux', keywords: ['ux ', 'experience utilisateur', 'ergonomie', 'user experience'] },
  { concept: 'accessibility', keywords: ['accessibilit'] },
  { concept: 'writing', keywords: ['ecriture', 'redaction', 'writing', 'expression ecrite', 'orthograph'] },
  { concept: 'journalism', keywords: ['journalis', 'presse', 'reportage', 'actualit', 'media'] },
  { concept: 'communication', keywords: ['communication', 'expression', 'oral ', 'pitch', 'prise de parole'] },
  { concept: 'languages', keywords: ['anglais', 'english', 'espagnol', 'allemand', 'italien', 'chinois', 'japonais', 'langue', 'lv1 ', 'lv2 ', 'fle '] },
  { concept: 'math', keywords: ['mathemat', 'maths ', 'math ', 'algebre', 'probabilit'] },
  { concept: 'statistics', keywords: ['statisti'] },
  { concept: 'ai', keywords: ['intelligence artificielle', 'ia ', 'machine learning', 'apprentissage automatique'] },
  { concept: 'security', keywords: ['securit', 'cyber', 'cryptograph'] },
  { concept: 'database', keywords: ['base de donnees', 'bases de donnees', 'bdd ', 'sql'] },
  { concept: 'data', keywords: ['donnees', 'data', 'visualisation'] },
  { concept: 'network', keywords: ['reseau', 'network', 'telecom', 'transmission'] },
  { concept: 'system', keywords: ['systeme', 'linux', 'unix', 'shell ', 'administration'] },
  { concept: 'mobile', keywords: ['mobile', 'android', 'ios '] },
  { concept: 'game', keywords: ['jeu video', 'jeux video', 'game', 'gaming', 'ludique'] },
  { concept: 'modeling', keywords: ['3d ', 'modelisation', 'blender', 'realite virtuelle'] },
  { concept: 'web', keywords: ['web', 'html', 'front', 'back end', 'backend', 'site'] },
  { concept: 'code', keywords: ['developpement', 'programmation', 'algorithm', 'code', 'logiciel', 'informatique', 'python', 'java'] },
  { concept: 'interface', keywords: ['interface', 'ihm ', 'maquett', 'prototyp', 'ui ', 'integration'] },
  { concept: 'design', keywords: ['design', 'graphi', 'creation', 'esthetique', 'illustration', 'typograph'] },
  { concept: 'video', keywords: ['video', 'audiovisuel', 'cinema', 'montage', 'motion', 'animation', 'tournage'] },
  { concept: 'photo', keywords: ['photo', 'image'] },
  { concept: 'audio', keywords: ['audio', 'son ', 'sonore', 'musique', 'podcast', 'radio'] },
  { concept: 'culture', keywords: ['culture', 'art ', 'arts ', 'theatre', 'litterature'] },
  { concept: 'history', keywords: ['histoire', 'historique', 'patrimoine'] },
  { concept: 'law', keywords: ['droit', 'juridique', 'legislation', 'rgpd'] },
  { concept: 'economics', keywords: ['economi', 'comptabil', 'finance', 'budget'] },
  { concept: 'marketing', keywords: ['marketing', 'strategie', 'publicit', 'referencement', 'seo ', 'commerce', 'marque', 'branding'] },
  { concept: 'management', keywords: ['management', 'organisation', 'ressources humaines'] },
  { concept: 'portfolio', keywords: ['portfolio', 'ppp ', 'projet personnel', 'professionnel'] },
  { concept: 'project', keywords: ['projet', 'agile', 'sae '] },
  { concept: 'entrepreneurship', keywords: ['entrepreneu', 'startup', 'innovation'] },
  { concept: 'company', keywords: ['stage', 'alternance', 'entreprise'] },
  { concept: 'society', keywords: ['sociolog', 'psycholog', 'sciences humaines', 'societe', 'ethique'] },
  { concept: 'physics', keywords: ['physique', 'mecanique', 'energie', 'optique'] },
  { concept: 'chemistry', keywords: ['chimi'] },
  { concept: 'biology', keywords: ['biolog', 'genetique', 'ecologie'] },
  { concept: 'electronics', keywords: ['electroni', 'automatisme', 'embarque', 'iot ', 'arduino'] },
  { concept: 'search', keywords: ['recherche documentaire', 'veille'] },
  { concept: 'sport', keywords: ['sport', 'eps ', 'activite physique'] },
]

// " développement front " → " developpement front ", padded so keywords can
// require a word start (leading space) and a word end (trailing space).
function normalizeSubject(value) {
  const words = String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
  return ` ${words} `
}

// Every concept whose keywords appear in the title, in rule order.
function matchSubjectConcepts(title) {
  const text = normalizeSubject(title)
  return SUBJECT_ICON_RULES
    .filter(({ keywords }) => keywords.some((keyword) => text.includes(` ${keyword}`)))
    .map(({ concept }) => concept)
}

// The style's column, and the weight suffix of Phosphor's variants. An
// unknown style draws Carbon, the tiles' default.
function readStyle(style) {
  if (style === 'tabler') return { column: 2, suffix: '' }
  if (style === 'phosphor') return { column: 1, suffix: '' }
  if (style === 'phosphor-fill') return { column: 1, suffix: '-fill' }
  if (style === 'phosphor-duotone') return { column: 1, suffix: '-duotone' }
  return { column: 0, suffix: '' }
}

// Subject title → Iconify icon, for the subjects of a semester, in the order
// given (callers pass them by module code, so an icon doesn't move when the
// grades do). Two different subjects never share an icon: one whose matches
// are taken gets its next match, then the fallbacks in order. Modules with
// the same title are one subject.
export function assignSubjectIcons(titles, style) {
  const { column, suffix } = readStyle(style)
  const icons = new Map()
  const usedConcepts = new Set()

  for (const title of titles) {
    const key = normalizeSubject(title)
    if (key.trim() === '' || icons.has(key)) continue

    const candidates = [...matchSubjectConcepts(title), ...FALLBACK_CONCEPTS]
    const concept = candidates.find((candidate) => !usedConcepts.has(candidate)) ?? candidates[0]
    usedConcepts.add(concept)
    icons.set(key, `${SUBJECT_ICONS[concept][column]}${SUBJECT_ICONS[concept][column].startsWith('ph:') ? suffix : ''}`)
  }

  return (title) => icons.get(normalizeSubject(title)) ?? null
}
