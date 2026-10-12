// ============================================================================
// Automatic icons for application tiles (see docs/ADDING_A_UNIVERSITY.md).
//
// Portal services rarely come with a usable icon. For every service a
// university lists, the server picks a concept from its title (French or
// English keywords: "mail", "calendar", "library"…) and a hue from a curated
// list. The first pick is written to a small JSON file per university, so
// every student of that university sees the same tile and a later change to
// the keyword list never reshuffles existing tiles: only services seen for
// the first time get a fresh pick.
//
// How a concept and a hue look is up to each university (appIcons in
// universities/<id>/server.js): an icon style (Iconify set) and a colour
// mode. Changing either restyles every tile without changing any pick.
//
// Stored per service: its id, the picked concept and hue, the portal title
// (to make the file readable) and the day it was first seen. Nothing about
// students: service ids and titles are the same for everyone.
// ============================================================================
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

export const APP_ICONS_FILE_VERSION = 1
// Per request, and per university file. Past MAX_STORED_SERVICES, new
// services are still answered but no longer written down.
export const MAX_REQUEST_SERVICES = 200
export const MAX_STORED_SERVICES = 500
const MAX_TITLE_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 300
const MAX_CATEGORY_LENGTH = 40

// Portal fnames, portlet ids and local service ids ("moodle-foad",
// "lent-iutlan-notes9"…). Anything else is ignored.
const SERVICE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
// "prefix:name", as Iconify writes it. Lets admins pin any icon of any set.
const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:-[a-z0-9]+)*$/

// --- Icons -------------------------------------------------------------------

export const GENERIC_CONCEPT = 'generic'

// Concept → [carbon, phosphor, tabler] icon. Concepts are what the JSON file
// stores: renaming one orphans its tiles. Every icon must exist on Iconify
// (tests/appIcons.test.js checks the shape, the API was checked by hand).
const ICONS_BY_CONCEPT = {
  'spell-check': ['carbon:spell-check', 'ph:text-aa', 'tabler:text-spellcheck'],
  'chat-bot': ['carbon:chat-bot', 'ph:robot', 'tabler:robot'],
  chat: ['carbon:chat', 'ph:chats-circle', 'tabler:messages'],
  visio: ['carbon:video-chat', 'ph:video-camera', 'tabler:video'],
  announcement: ['carbon:bullhorn', 'ph:megaphone', 'tabler:speakerphone'],
  mail: ['carbon:email', 'ph:envelope-simple', 'tabler:mail'],
  office: ['carbon:apps', 'ph:squares-four', 'tabler:layout-grid'],
  calendar: ['carbon:calendar', 'ph:calendar-blank', 'tabler:calendar'],
  collaboration: ['carbon:collaborate', 'ph:users-three', 'tabler:users-group'],
  // Brand logo (BRAND_CONCEPTS): the same mark in every style.
  moodle: ['devicon-plain:moodle', 'devicon-plain:moodle', 'devicon-plain:moodle'],
  course: ['carbon:education', 'ph:graduation-cap', 'tabler:school'],
  exam: ['carbon:task', 'ph:exam', 'tabler:clipboard-check'],
  grades: ['carbon:report', 'ph:chart-bar', 'tabler:chart-bar'],
  diploma: ['carbon:certificate', 'ph:certificate', 'tabler:certificate'],
  jobs: ['carbon:portfolio', 'ph:briefcase', 'tabler:briefcase'],
  'student-record': ['carbon:user-profile', 'ph:folder-user', 'tabler:folder-user'],
  orientation: ['carbon:compass', 'ph:compass', 'tabler:compass'],
  directory: ['carbon:user-multiple', 'ph:address-book', 'tabler:address-book'],
  publications: ['carbon:catalog', 'ph:books', 'tabler:books'],
  library: ['carbon:book', 'ph:book-open', 'tabler:book'],
  research: ['carbon:microscope', 'ph:flask', 'tabler:microscope'],
  search: ['carbon:search', 'ph:magnifying-glass', 'tabler:search'],
  vpn: ['carbon:vpn', 'ph:shield-check', 'tabler:shield-lock'],
  wifi: ['carbon:wifi', 'ph:wifi-high', 'tabler:wifi'],
  printing: ['carbon:printer', 'ph:printer', 'tabler:printer'],
  security: ['carbon:locked', 'ph:lock-key', 'tabler:lock'],
  account: ['carbon:password', 'ph:key', 'tabler:key'],
  upload: ['carbon:cloud-upload', 'ph:cloud-arrow-up', 'tabler:cloud-upload'],
  cloud: ['carbon:cloud', 'ph:cloud', 'tabler:cloud'],
  files: ['carbon:folder', 'ph:folder', 'tabler:folder'],
  signature: ['carbon:document-signed', 'ph:signature', 'tabler:signature'],
  video: ['carbon:play-outline', 'ph:play-circle', 'tabler:player-play'],
  documentation: ['carbon:notebook', 'ph:notebook', 'tabler:notebook'],
  restaurant: ['carbon:restaurant', 'ph:fork-knife', 'tabler:tools-kitchen-2'],
  payment: ['carbon:wallet', 'ph:wallet', 'tabler:wallet'],
  map: ['carbon:map', 'ph:map-trifold', 'tabler:map'],
  card: ['carbon:identification', 'ph:identification-card', 'tabler:id'],
  help: ['carbon:help', 'ph:question', 'tabler:help'],
  sport: ['carbon:basketball', 'ph:basketball', 'tabler:ball-basketball'],
  accessibility: ['carbon:accessibility', 'ph:wheelchair', 'tabler:wheelchair'],
  health: ['carbon:health-cross', 'ph:first-aid', 'tabler:first-aid-kit'],
  housing: ['carbon:building', 'ph:buildings', 'tabler:building'],
  transport: ['carbon:bus', 'ph:bus', 'tabler:bus'],
  international: ['carbon:earth', 'ph:globe-hemisphere-west', 'tabler:world'],
  languages: ['carbon:translate', 'ph:translate', 'tabler:language'],
  survey: ['carbon:list-checked', 'ph:list-checks', 'tabler:list-check'],
  form: ['carbon:document', 'ph:file-text', 'tabler:file-text'],
  events: ['carbon:events', 'ph:confetti', 'tabler:confetti'],
  desktop: ['carbon:screen', 'ph:desktop', 'tabler:device-desktop'],
  code: ['carbon:code', 'ph:code', 'tabler:code'],
  software: ['carbon:download', 'ph:download-simple', 'tabler:download'],
  equipment: ['carbon:box', 'ph:package', 'tabler:package'],
  booking: ['carbon:calendar-add-alt', 'ph:calendar-plus', 'tabler:calendar-plus'],
  analytics: ['carbon:analytics', 'ph:chart-pie-slice', 'tabler:chart-pie'],
  phone: ['carbon:phone', 'ph:phone', 'tabler:phone'],
  mobile: ['carbon:mobile', 'ph:device-mobile', 'tabler:device-mobile'],
  settings: ['carbon:settings', 'ph:gear-six', 'tabler:settings'],
  tools: ['carbon:tool-kit', 'ph:wrench', 'tabler:tool'],
  home: ['carbon:home', 'ph:house', 'tabler:home'],
  [GENERIC_CONCEPT]: ['carbon:application-web', 'ph:app-window', 'tabler:app-window'],
}

export const APP_ICON_CONCEPTS = Object.keys(ICONS_BY_CONCEPT)

// Concepts drawn with the service's own logo: they win over a stored concept
// (see resolve), so a brand added later reaches tiles picked before it.
const BRAND_CONCEPTS = new Set(['moodle'])

// The weight suffix only exists on Phosphor icons, not on brand logos.
function pickColumn(column, suffix = '') {
  return Object.fromEntries(
    Object.entries(ICONS_BY_CONCEPT).map(([concept, icons]) => [
      concept,
      icons[column].startsWith('ph:') ? `${icons[column]}${suffix}` : icons[column],
    ]),
  )
}

// Icon styles a university can pick (appIcons.style). Phosphor's fill and
// duotone weights share the regular names plus a suffix.
export const APP_ICON_STYLES = Object.freeze({
  carbon: pickColumn(0),
  phosphor: pickColumn(1),
  'phosphor-fill': pickColumn(1, '-fill'),
  'phosphor-duotone': pickColumn(1, '-duotone'),
  tabler: pickColumn(2),
})
export const DEFAULT_APP_ICON_STYLE = 'carbon'

// --- Colours -------------------------------------------------------------------

// Hues (Tailwind shades 100…950). Keys are what the JSON file stores:
// renaming one orphans its tiles.
const HUES = {
  red: { 100: '#fee2e2', 300: '#fca5a5', 400: '#f87171', 600: '#dc2626', 700: '#b91c1c', 900: '#7f1d1d', 950: '#450a0a' },
  orange: { 100: '#ffedd5', 300: '#fdba74', 400: '#fb923c', 600: '#ea580c', 700: '#c2410c', 900: '#7c2d12', 950: '#431407' },
  yellow: { 100: '#fef9c3', 300: '#fde047', 400: '#facc15', 600: '#ca8a04', 700: '#a16207', 900: '#713f12', 950: '#422006' },
  lime: { 100: '#ecfccb', 300: '#bef264', 400: '#a3e635', 600: '#65a30d', 700: '#4d7c0f', 900: '#365314', 950: '#1a2e05' },
  green: { 100: '#dcfce7', 300: '#86efac', 400: '#4ade80', 600: '#16a34a', 700: '#15803d', 900: '#14532d', 950: '#052e16' },
  teal: { 100: '#ccfbf1', 300: '#5eead4', 400: '#2dd4bf', 600: '#0d9488', 700: '#0f766e', 900: '#134e4a', 950: '#042f2e' },
  cyan: { 100: '#cffafe', 300: '#67e8f9', 400: '#22d3ee', 600: '#0891b2', 700: '#0e7490', 900: '#164e63', 950: '#083344' },
  sky: { 100: '#e0f2fe', 300: '#7dd3fc', 400: '#38bdf8', 600: '#0284c7', 700: '#0369a1', 900: '#0c4a6e', 950: '#082f49' },
  blue: { 100: '#dbeafe', 300: '#93c5fd', 400: '#60a5fa', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a', 950: '#172554' },
  indigo: { 100: '#e0e7ff', 300: '#a5b4fc', 400: '#818cf8', 600: '#4f46e5', 700: '#4338ca', 900: '#312e81', 950: '#1e1b4b' },
  violet: { 100: '#ede9fe', 300: '#c4b5fd', 400: '#a78bfa', 600: '#7c3aed', 700: '#6d28d9', 900: '#4c1d95', 950: '#2e1065' },
  fuchsia: { 100: '#fae8ff', 300: '#f0abfc', 400: '#e879f9', 600: '#c026d3', 700: '#a21caf', 900: '#701a75', 950: '#4a044e' },
  pink: { 100: '#fce7f3', 300: '#f9a8d4', 400: '#f472b6', 600: '#db2777', 700: '#be185d', 900: '#831843', 950: '#500724' },
}
export const APP_ICON_HUES = Object.keys(HUES)

function buildColorMode(toPair) {
  return Object.freeze(Object.fromEntries(APP_ICON_HUES.map((hue) => [hue, toPair(HUES[hue])])))
}

// Colour modes a university can pick (appIcons.colorMode): how a hue turns
// into a tile background and glyph colour, in light and dark mode.
export const APP_ICON_COLOR_MODES = Object.freeze({
  // Bright pastel tile, deep glyph of the same hue (the look of Rennes' old
  // hand-made icons). Dark mode deepens the tile a little so it doesn't glare.
  pastel: buildColorMode((shades) => ({
    light: { bg: shades[300], fg: shades[900] },
    dark: { bg: shades[400], fg: shades[950] },
  })),
  // Light tint with a coloured glyph; deep tinted tile in dark mode.
  soft: buildColorMode((shades) => ({
    light: { bg: shades[100], fg: shades[700] },
    dark: { bg: shades[900], fg: shades[300] },
  })),
  // Saturated tile, white glyph.
  vivid: buildColorMode((shades) => ({
    light: { bg: shades[600], fg: '#ffffff' },
    dark: { bg: shades[600], fg: '#ffffff' },
  })),
  // No colour: the app's own surfaces and text (src/index.css tokens).
  mono: buildColorMode(() => ({
    light: { bg: '#ffffff', fg: '#341200' },
    dark: { bg: '#2a2a2a', fg: '#e4e4e4' },
  })),
})
export const DEFAULT_APP_ICON_COLOR_MODE = 'pastel'

// A university's look (universities/<id>/server.js → appIcons):
//   { style?: 'carbon' | 'phosphor' | 'phosphor-fill' | 'phosphor-duotone' | 'tabler',
//     colorMode?: 'pastel' | 'soft' | 'vivid' | 'mono',
//     icons?: { [concept]: 'prefix:name' } }   // replace single concepts
// Throws on unknown values, like an unknown university id: a typo should
// stop the server, not silently fall back.
export function resolveAppIconTheme(config = {}) {
  const style = config.style ?? DEFAULT_APP_ICON_STYLE
  const colorMode = config.colorMode ?? DEFAULT_APP_ICON_COLOR_MODE

  if (!Object.hasOwn(APP_ICON_STYLES, style)) {
    throw new Error(`Unknown appIcons.style "${style}". Available: ${Object.keys(APP_ICON_STYLES).join(', ')}.`)
  }
  if (!Object.hasOwn(APP_ICON_COLOR_MODES, colorMode)) {
    throw new Error(`Unknown appIcons.colorMode "${colorMode}". Available: ${Object.keys(APP_ICON_COLOR_MODES).join(', ')}.`)
  }

  const icons = { ...APP_ICON_STYLES[style] }
  for (const [concept, icon] of Object.entries(config.icons ?? {})) {
    if (!Object.hasOwn(ICONS_BY_CONCEPT, concept) || !ICON_NAME_PATTERN.test(String(icon))) {
      throw new Error(`Invalid appIcons.icons entry "${concept}": "${icon}". Concepts: ${APP_ICON_CONCEPTS.join(', ')}.`)
    }
    icons[concept] = icon
  }

  return { style, colorMode, icons, palette: APP_ICON_COLOR_MODES[colorMode] }
}

// One of our own icons, in any style (e.g. "carbon:report", "ph:chart-bar-duotone")
// → its concept. A file holding such a name (written by hand, or by an early
// version that stored names) then still follows the university's style.
const CONCEPT_BY_BUILT_IN_ICON = new Map(
  Object.values(APP_ICON_STYLES).flatMap((icons) => Object.entries(icons).map(([concept, icon]) => [icon, concept])),
)

// Stored icon (a concept, or an Iconify name an admin pinned) → Iconify name
// in this university's style.
export function toIconifyName(storedIcon, theme) {
  const concept = Object.hasOwn(theme.icons, storedIcon) ? storedIcon : CONCEPT_BY_BUILT_IN_ICON.get(storedIcon)
  if (concept) {
    return theme.icons[concept]
  }
  return ICON_NAME_PATTERN.test(storedIcon) ? storedIcon : theme.icons[GENERIC_CONCEPT]
}

// --- Matching ------------------------------------------------------------------

// Keyword → concept, first match wins, so specific rules come before broad
// ones ("liste de diffusion" before "mail", "emploi du temps" before
// "emploi"). Keywords match the start of a word, accents and case ignored:
// "biblio" matches « Bibliothèques ». A trailing space also requires the word
// to end there: "bu " matches « BU » but not « bureautique ».
export const APP_ICON_RULES = [
  { concept: 'spell-check', keywords: ['orthograph', 'voltaire', 'ecri+'] },
  { concept: 'chat-bot', keywords: ['intelligence artificielle', 'ia ', 'chatgpt', 'copilot', 'mistral', 'llm '] },
  { concept: 'chat', keywords: ['messagerie instantanee', 'chat ', 'tchat', 'mattermost', 'rocket chat', 'discord', 'communication'] },
  { concept: 'visio', keywords: ['visio', 'webconf', 'web conf', 'webinaire', 'webinar', 'zoom ', 'teams ', 'big blue', 'bbb ', 'jitsi', 'rendez vous', 'classe virtuelle', 'meet '] },
  { concept: 'announcement', keywords: ['liste de diffusion', 'listes de diffusion', 'mailing', 'sympa ', 'actualite', 'annonce', 'newsletter', 'news'] },
  { concept: 'mail', keywords: ['messagerie', 'mail', 'webmail', 'courriel', 'zimbra', 'outlook', 'boite aux lettres', 'boite mail'] },
  { concept: 'office', keywords: ['microsoft', 'office 365', 'o365 ', 'm365 ', 'office ', 'onedrive', 'sharepoint', 'google workspace', 'suite bureautique'] },
  { concept: 'calendar', keywords: ['emploi du temps', 'emplois du temps', 'edt ', 'planning', 'calendrier', 'agenda', 'ade ', 'hyperplanning', 'celcat', 'horaire', 'timetable', 'schedule', 'calendar'] },
  { concept: 'collaboration', keywords: ['klaxoon', 'wooclap', 'collabor', 'pad ', 'etherpad', 'tableau blanc', 'whiteboard', 'brainstorm', 'mural', 'miro ', 'quiz'] },
  { concept: 'moodle', keywords: ['moodle'] },
  { concept: 'course', keywords: ['foad', 'e learning', 'elearning', 'cours en ligne', 'plateforme pedagogique', 'espace pedagogique', 'mooc', 'formation a distance', 'enseignement a distance', 'teleformation', 'auto formati', 'autoformation', 'module', 'ecampus', 'e campus', 'chamilo', 'claroline', 'blackboard', 'tutorat', 'cours ', 'learning'] },
  { concept: 'exam', keywords: ['examen', 'convocation', 'partiel'] },
  { concept: 'grades', keywords: ['notes ', 'note ', 'resultat', 'releve', 'bulletin', 'scodoc', 'moyenne', 'grades'] },
  { concept: 'diploma', keywords: ['diplome', 'attestation', 'certificat', 'certification'] },
  { concept: 'jobs', keywords: ['stage', 'emploi', 'job', 'alternance', 'apprentissage', 'offres', 'recrutement', 'carriere', 'insertion professionnelle', 'internship', 'career', 'entreprise'] },
  { concept: 'student-record', keywords: ['scolarite', 'dossier etudiant', 'dossier administratif', 'apogee', 'pegase', 'inscription', 'reinscription', 'contrat pedagogique', 'ia web', 'ip web', 'student record'] },
  { concept: 'orientation', keywords: ['orientation', 'suio', 'scuio', 'parcoursup', 'projet professionnel', 'accompagnement', 'reussite'] },
  { concept: 'directory', keywords: ['annuaire', 'directory', 'contacts', 'trombinoscope', 'trombi', 'qui est qui', 'people'] },
  { concept: 'publications', keywords: ['these', 'hal ', 'archive ouverte', 'archives ouvertes', 'publication', 'ori oai', 'depot institutionnel'] },
  { concept: 'library', keywords: ['bibliotheque', 'bu ', 'scd ', 'documentaire', 'catalogue', 'livre', 'library', 'ressources electroniques', 'periodique', 'revues', 'primo', 'koha', 'cairn', 'europresse', 'lecture', 'mediatheque'] },
  { concept: 'research', keywords: ['recherche scientifique', 'laboratoire', 'labo ', 'research'] },
  { concept: 'search', keywords: ['recherche', 'search', 'moteur'] },
  { concept: 'vpn', keywords: ['vpn', 'acces distant', 'connexion a distance'] },
  { concept: 'wifi', keywords: ['wifi', 'wi fi', 'eduroam', 'reseau', 'network'] },
  { concept: 'printing', keywords: ['impression', 'imprim', 'print', 'photocopi', 'reprographie', 'copieur', 'papercut'] },
  { concept: 'security', keywords: ['authentification', 'mfa ', '2fa ', 'multifacteur', 'double facteur', 'securite', 'otp ', 'security'] },
  { concept: 'account', keywords: ['compte', 'mot de passe', 'password', 'sesame', 'identifiant', 'account'] },
  { concept: 'upload', keywords: ['filesender', 'mise en ligne', 'envoi de fichier', 'transfert de fichier', 'depot de fichier', 'upload'] },
  { concept: 'cloud', keywords: ['drive', 'stockage', 'cloud', 'nextcloud', 'owncloud', 'seafile', 'storage'] },
  { concept: 'files', keywords: ['fichier', 'files', 'dossiers partages', 'documents'] },
  { concept: 'signature', keywords: ['signature', 'parapheur', 'signer', 'contrat', 'convention'] },
  { concept: 'video', keywords: ['video', 'mediaserver', 'media', 'pod ', 'nudgis', 'ubicast', 'podcast', 'webtv', 'web tv', 'youtube', 'streaming', 'replay', 'capsule'] },
  { concept: 'documentation', keywords: ['documentation', 'guide', 'tutoriel', 'tuto ', 'mode d emploi', 'manuel', 'wiki', 'notice', 'doc '] },
  { concept: 'restaurant', keywords: ['restau', 'resto', 'crous', 'cafeteria', 'cafet', 'repas', 'menu', 'cantine', 'ru '] },
  { concept: 'payment', keywords: ['paiement', 'payer', 'payment', 'cvec', 'frais', 'facture', 'bourse', 'aide financiere', 'aides financieres', 'izly', 'remboursement', 'boutique', 'achat'] },
  { concept: 'map', keywords: ['plan du campus', 'plan ', 'carte du campus', 'campus map', 'localisation', 'batiments'] },
  { concept: 'card', keywords: ['carte', 'badge', 'leocarte', 'student card'] },
  { concept: 'help', keywords: ['assistance', 'support', 'helpdesk', 'help desk', 'hotline', 'aide', 'ticket', 'glpi', 'depannage', 'incident', 'sos ', 'faq ', 'help'] },
  { concept: 'sport', keywords: ['sport', 'suaps', 'staps', 'activites physiques', 'gymnase', 'piscine', 'fitness', 'musculation'] },
  { concept: 'accessibility', keywords: ['handicap', 'accessibilite', 'accessibility'] },
  { concept: 'health', keywords: ['sante', 'medecin', 'medical', 'ssu ', 'sumpps', 'psycholog', 'infirmer', 'bien etre', 'health'] },
  { concept: 'housing', keywords: ['logement', 'residence', 'housing', 'hebergement'] },
  { concept: 'transport', keywords: ['transport', 'bus ', 'velo', 'parking', 'stationnement', 'covoiturage', 'navette'] },
  { concept: 'international', keywords: ['international', 'erasmus', 'mobilite', 'etranger', 'echange', 'abroad'] },
  { concept: 'languages', keywords: ['langue', 'anglais', 'toeic', 'language', 'english', 'traduction'] },
  { concept: 'survey', keywords: ['enquete', 'sondage', 'questionnaire', 'evaluation des enseignements', 'limesurvey', 'vote', 'election', 'survey'] },
  { concept: 'form', keywords: ['demarche', 'demande', 'requete', 'formulaire', 'form '] },
  { concept: 'events', keywords: ['vie etudiante', 'vie de campus', 'association', 'culture', 'evenement', 'club', 'bde ', 'loisir', 'spectacle', 'musique'] },
  { concept: 'desktop', keywords: ['bureau virtuel', 'bureau a distance', 'vdi ', 'machine virtuelle', 'salle informatique'] },
  { concept: 'code', keywords: ['gitlab', 'github', 'git ', 'forge', 'code', 'developpement', 'jupyter', 'programmation', 'calcul', 'hpc ', 'cluster', 'serveur', 'linux', 'terminal', 'ssh '] },
  { concept: 'software', keywords: ['logiciel', 'software', 'telechargement', 'antivirus'] },
  { concept: 'equipment', keywords: ['pret de materiel', 'materiel', 'emprunt', 'location', 'loxya', 'equipement'] },
  { concept: 'booking', keywords: ['reservation', 'reserver', 'booking', 'salle'] },
  { concept: 'analytics', keywords: ['statistique', 'tableau de bord', 'dashboard', 'pilotage', 'indicateur', 'decisionnel'] },
  { concept: 'phone', keywords: ['telephon', 'standard', 'voip'] },
  { concept: 'mobile', keywords: ['application mobile', 'app mobile', 'appli'] },
  { concept: 'settings', keywords: ['parametre', 'preference', 'reglage', 'configuration', 'settings', 'profil'] },
  { concept: 'tools', keywords: ['outil', 'tools', 'boite a outils'] },
  // Broad words, mostly reached through category labels (« Pédagogie »).
  { concept: 'course', keywords: ['pedagog', 'enseignement', 'formation'] },
  { concept: 'home', keywords: ['portail', 'accueil', 'intranet', 'ent '] },
]

// Lowercase, no accents, words separated by single spaces.
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, ' ')
    .trim()
}

const COMPILED_RULES = APP_ICON_RULES.map(({ concept, keywords }) => ({
  concept,
  needles: keywords.map((keyword) => ` ${normalizeText(keyword)}${keyword.endsWith(' ') ? ' ' : ''}`),
}))

function matchText(text) {
  const haystack = ` ${normalizeText(text)} `
  if (!haystack.trim()) {
    return null
  }

  for (const { concept, needles } of COMPILED_RULES) {
    if (needles.some((needle) => haystack.includes(needle))) {
      return concept
    }
  }

  return null
}

// The title decides; the description and the university's category label
// only help when the title says nothing ("Pod", "Sésame"…).
export function matchAppIcon({ title, description, category } = {}) {
  return matchText(title) ?? matchText(description) ?? matchText(category)
}

// The brand logo a title calls for ("Moodle FOAD" → moodle), or null.
function matchBrand(title) {
  const concept = matchText(title)
  return concept && BRAND_CONCEPTS.has(concept) ? concept : null
}

// FNV-1a: tiny, stable across Node versions and platforms.
export function hashString(value) {
  let hash = 0x811c9dc5
  for (const char of String(value)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

// Starts from the id's hash and, when `usage` (hue → number of tiles) is
// given, moves on to the next least used colour, so neighbouring tiles don't
// all end up the same. Same id and same usage → same colour.
export function pickAppColor(id, usage = null) {
  const start = hashString(id) % APP_ICON_HUES.length
  if (!usage) {
    return APP_ICON_HUES[start]
  }

  const minUsage = Math.min(...APP_ICON_HUES.map((key) => usage.get(key) ?? 0))
  for (let offset = 0; offset < APP_ICON_HUES.length; offset += 1) {
    const key = APP_ICON_HUES[(start + offset) % APP_ICON_HUES.length]
    if ((usage.get(key) ?? 0) === minUsage) {
      return key
    }
  }

  return APP_ICON_HUES[start]
}

export function assignAppIcon(service, usage = null) {
  return {
    icon: matchAppIcon(service) ?? GENERIC_CONCEPT,
    color: pickAppColor(service.id, usage),
  }
}

// A stored entry: a concept (or a pinned Iconify name) and a hue.
export function isValidAppIconEntry(entry) {
  return Boolean(entry)
    && typeof entry.icon === 'string'
    && (Object.hasOwn(ICONS_BY_CONCEPT, entry.icon) || ICON_NAME_PATTERN.test(entry.icon))
    && Object.hasOwn(HUES, entry.color)
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') {
    return ''
  }

  // \p{Cc}: control characters (newlines, NUL…).
  return value
    .replace(/\p{Cc}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

// Request body: { services: [{ id, title, description?, category? }] }.
// Returns the valid, de-duplicated services (at most MAX_REQUEST_SERVICES),
// or null when the body isn't that shape at all.
export function sanitizeAppIconRequest(body) {
  if (!body || typeof body !== 'object' || !Array.isArray(body.services)) {
    return null
  }

  const services = []
  const seenIds = new Set()

  for (const item of body.services.slice(0, MAX_REQUEST_SERVICES)) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    const title = cleanText(item?.title, MAX_TITLE_LENGTH)
    if (!SERVICE_ID_PATTERN.test(id) || !title || seenIds.has(id)) {
      continue
    }

    seenIds.add(id)
    services.push({
      id,
      title,
      description: cleanText(item.description, MAX_DESCRIPTION_LENGTH),
      category: cleanText(item.category, MAX_CATEGORY_LENGTH),
    })
  }

  return services
}

// Assignments of one university, kept in <dataDir>/app-icons/<id>.json.
//
// - The file is read on first use and re-read whenever its mtime changes, so
//   an admin can edit or delete entries without restarting the server.
// - Writes go to a temporary file renamed over the real one (atomic on the
//   same filesystem), one at a time.
// - If the directory can't be written (read-only volume, permissions) or the
//   file can't be parsed, assignments carry on in memory only: tiles still
//   get icons, they just aren't remembered across restarts. A broken file is
//   left untouched for the admin to fix.
export function createAppIconStore({ universityId, dataDir, logger = console, now = () => new Date() }) {
  const filePath = path.join(dataDir, 'app-icons', `${universityId}.json`)
  const entries = new Map()
  let loaded = false
  let fileMtimeMs = null
  let persistent = true
  let queue = Promise.resolve()

  function disablePersistence(reason, error) {
    if (persistent) {
      logger.warn?.(`[app-icons] ${reason} (${filePath}): ${error?.code ?? error?.message ?? error}. Icons are kept in memory only.`)
    }
    persistent = false
  }

  async function readMtime() {
    try {
      return (await stat(filePath)).mtimeMs
    } catch (error) {
      if (error?.code === 'ENOENT') return null
      throw error
    }
  }

  async function loadIfChanged() {
    if (!persistent && loaded) {
      return
    }

    let mtimeMs
    try {
      mtimeMs = await readMtime()
    } catch (error) {
      disablePersistence('cannot read the icon file', error)
      loaded = true
      return
    }

    if (loaded && mtimeMs === fileMtimeMs) {
      return
    }

    // Deleting the file resets everything; editing it replaces what we had.
    entries.clear()
    fileMtimeMs = mtimeMs
    loaded = true
    if (mtimeMs === null) {
      return
    }

    try {
      const data = JSON.parse(await readFile(filePath, 'utf8'))
      for (const [id, entry] of Object.entries(data?.services ?? {})) {
        if (SERVICE_ID_PATTERN.test(id) && isValidAppIconEntry(entry)) {
          entries.set(id, {
            icon: entry.icon,
            color: entry.color,
            title: typeof entry.title === 'string' ? entry.title.slice(0, MAX_TITLE_LENGTH) : '',
            assignedAt: typeof entry.assignedAt === 'string' ? entry.assignedAt.slice(0, 10) : '',
          })
        }
      }
    } catch (error) {
      disablePersistence('cannot parse the icon file', error)
    }
  }

  async function save() {
    const services = Object.fromEntries(
      [...entries.entries()].sort(([a], [b]) => a.localeCompare(b)),
    )
    const content = `${JSON.stringify({ version: APP_ICONS_FILE_VERSION, university: universityId, services }, null, 2)}\n`
    const tempPath = `${filePath}.${randomUUID()}.tmp`

    try {
      await mkdir(path.dirname(filePath), { recursive: true })
      await writeFile(tempPath, content, 'utf8')
      await rename(tempPath, filePath)
      fileMtimeMs = await readMtime()
    } catch (error) {
      await unlink(tempPath).catch(() => {})
      disablePersistence('cannot write the icon file', error)
    }
  }

  function getUsage() {
    const usage = new Map()
    for (const { color } of entries.values()) {
      usage.set(color, (usage.get(color) ?? 0) + 1)
    }
    return usage
  }

  // services: sanitized ({ id, title, description, category }).
  // remember: false answers without writing anything down (used for ids the
  // server can't vouch for, see the route in entAuthApp.js).
  // Returns { [id]: { icon, color } }.
  async function resolve(services, { remember = true } = {}) {
    await loadIfChanged()

    const result = {}
    const usage = getUsage()
    let changed = false
    // Sorted, so the same new services get the same colours whatever order
    // the portal lists them in.
    const sorted = [...services].sort((a, b) => a.id.localeCompare(b.id))

    for (const service of sorted) {
      const existing = entries.get(service.id)
      if (existing) {
        // A brand logo replaces a stored concept (not an icon an admin
        // pinned by name); the colour stays.
        const brand = matchBrand(service.title)
        const isPinned = !Object.hasOwn(ICONS_BY_CONCEPT, existing.icon) && !CONCEPT_BY_BUILT_IN_ICON.has(existing.icon)
        result[service.id] = { icon: brand && !isPinned ? brand : existing.icon, color: existing.color }
        continue
      }

      const canRemember = remember && entries.size < MAX_STORED_SERVICES
      const assignment = assignAppIcon(service, canRemember ? usage : null)
      result[service.id] = assignment

      if (canRemember) {
        entries.set(service.id, {
          ...assignment,
          title: service.title,
          assignedAt: now().toISOString().slice(0, 10),
        })
        usage.set(assignment.color, (usage.get(assignment.color) ?? 0) + 1)
        changed = true
      }
    }

    if (changed && persistent) {
      await save()
    }

    return result
  }

  return {
    filePath,
    get persistent() {
      return persistent
    },
    // One resolve at a time: two first visits racing each other must not pick
    // different tiles for the same new service.
    resolve(services, options) {
      const run = queue.then(() => resolve(services, options))
      queue = run.catch(() => {})
      return run
    },
  }
}

// Data directory for the files above. DATA_DIR in production (the Docker
// image points it at a volume), ./data next to the code otherwise.
export function resolveDataDir(env = process.env) {
  const configured = String(env.DATA_DIR ?? '').trim()
  return configured ? path.resolve(configured) : path.resolve('data')
}
