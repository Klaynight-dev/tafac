export const DEMO_SESSION_MODE = 'demo'

export const DEMO_CREDENTIALS = Object.freeze({
  username: 'demo@tafac.fr',
  password: 'tafac-demo',
})

const DEMO_DEFAULT_FAVORITE_IDS = [
  'demo-mail',
  'demo-planning',
  'demo-moodle',
  'demo-directory',
]

const DEMO_SCHEDULE_TEMPLATES = [
  {
    key: 'ux-writing',
    dayOffset: 0,
    startHour: 9,
    startMinute: 0,
    durationMinutes: 120,
    title: 'R5.07 UX Writing',
    teacher: 'M. Le Goff',
    location: 'B03 - Salle Atelier',
  },
  {
    key: 'sae-proto',
    dayOffset: 1,
    startHour: 13,
    startMinute: 30,
    durationMinutes: 180,
    title: 'SAE Prototype interactif',
    teacher: 'Mme Le Fur',
    location: 'C12 - FabLab',
  },
  {
    key: 'dev-front',
    dayOffset: 2,
    startHour: 10,
    startMinute: 15,
    durationMinutes: 105,
    title: 'R5.11 Développement Front',
    teacher: 'M. Lemoine',
    location: 'A08 - Info 2',
  },
  {
    key: 'culture-num',
    dayOffset: 3,
    startHour: 15,
    startMinute: 15,
    durationMinutes: 90,
    title: 'R5.02 Culture numérique',
    teacher: 'Mme Martin',
    location: 'Amphi 2',
  },
]

const DEMO_APPLICATIONS = Object.freeze([
  {
    id: 'demo-mail',
    fname: 'demo-messagerie',
    title: 'Messagerie',
    description: 'Consulter un webmail de démonstration.',
    href: 'https://outlook.office.com/mail/',
    target: '_blank',
  },
  {
    id: 'demo-planning',
    fname: 'demo-emploi-du-temps',
    title: 'Emplois du temps',
    description: 'Ouvrir un calendrier public.',
    href: 'https://calendar.google.com/',
    target: '_blank',
  },
  {
    id: 'demo-moodle',
    fname: 'demo-moodle',
    title: 'Moodle',
    description: 'Découvrir une plateforme de cours en ligne.',
    href: 'https://moodle.org/',
    target: '_blank',
  },
  {
    id: 'demo-directory',
    fname: 'demo-annuaire',
    title: 'Annuaire',
    description: 'Parcourir un annuaire public.',
    href: 'https://www.pagesjaunes.fr/',
    target: '_blank',
  },
  {
    id: 'demo-docs',
    fname: 'demo-documentation',
    title: 'Documentation services',
    description: 'Lire une documentation produit publique.',
    href: 'https://support.microsoft.com/',
    target: '_blank',
  },
  {
    id: 'demo-help',
    fname: 'demo-assistance',
    title: 'Assistance',
    description: 'Consulter une page d’aide.',
    href: 'https://support.google.com/',
    target: '_blank',
  },
  {
    id: 'demo-webconf',
    fname: 'demo-webconference',
    title: 'Webconference',
    description: 'Lancer une visioconférence publique.',
    href: 'https://meet.jit.si/',
    target: '_blank',
  },
  {
    id: 'demo-365',
    fname: 'demo-m365',
    title: 'Microsoft 365',
    description: 'Voir la suite bureautique en ligne.',
    href: 'https://www.microsoft.com/microsoft-365',
    target: '_blank',
  },
])

const DEMO_APPLICATIONS_BY_ID = new Map(DEMO_APPLICATIONS.map((application) => [application.id, application]))
const DEMO_APPLICATIONS_BY_FNAME = new Map(DEMO_APPLICATIONS.map((application) => [application.fname, application]))

const DEMO_TREE_ROOT = Object.freeze({
  id: '-100',
  name: 'Ressources',
  path: 'Ressources',
  children: [
    {
      id: '10',
      name: 'IUT Lannion',
      path: 'Université de Rennes / IUT Lannion',
      children: [
        {
          id: '110',
          name: 'BUT MMI',
          path: 'Université de Rennes / IUT Lannion / BUT MMI',
          children: [
            {
              id: '111',
              name: 'MMI 2',
              path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2',
              children: [
                {
                  id: '1111',
                  name: 'TD A',
                  path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2 / TD A',
                  children: [
                    {
                      id: '11111',
                      name: 'TP 1',
                      path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2 / TD A / TP 1',
                      children: [],
                    },
                    {
                      id: '11112',
                      name: 'TP 2',
                      path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2 / TD A / TP 2',
                      children: [],
                    },
                  ],
                },
                {
                  id: '1112',
                  name: 'TD B',
                  path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2 / TD B',
                  children: [
                    {
                      id: '11121',
                      name: 'TP 3',
                      path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 2 / TD B / TP 3',
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              id: '112',
              name: 'MMI 1',
              path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 1',
              children: [
                {
                  id: '1121',
                  name: 'TD A',
                  path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 1 / TD A',
                  children: [
                    {
                      id: '11211',
                      name: 'TP 1',
                      path: 'Université de Rennes / IUT Lannion / BUT MMI / MMI 1 / TD A / TP 1',
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const DEMO_DEFAULT_TREE_PATH = Object.freeze(['-100', '10', '110', '111', '1111', '11111'])

function cloneDemoValue(value) {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value)
  }

  return JSON.parse(JSON.stringify(value))
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createDemoAvatarDataUri(initials = 'CM') {
  // Just the initials on a flat warm tone; the app crops it to a circle.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="Avatar demo"><rect width="128" height="128" fill="#ebe4d6"/><text x="64" y="64" dy="0.35em" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="600" fill="#341200">${escapeHtml(initials)}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export const DEMO_ACCOUNT = Object.freeze({
  preferred_username: DEMO_CREDENTIALS.username,
  given_name: 'Camille',
  family_name: 'Martin',
  email: DEMO_CREDENTIALS.username,
  mail: DEMO_CREDENTIALS.username,
  name: 'Camille Martin',
  picture: createDemoAvatarDataUri('CM'),
})

function normalizeDemoFavoriteIds(value) {
  if (!Array.isArray(value)) {
    return [...DEMO_DEFAULT_FAVORITE_IDS]
  }

  return value
    .map((id) => String(id ?? '').trim())
    .filter((id, index, ids) => id && ids.indexOf(id) === index && DEMO_APPLICATIONS_BY_ID.has(id))
}

export function isDemoCredentials(username, password) {
  return String(username ?? '').trim().toLowerCase() === DEMO_CREDENTIALS.username.toLowerCase()
    && String(password ?? '') === DEMO_CREDENTIALS.password
}

export function createInitialDemoState() {
  return {
    favoritePortletIds: [...DEMO_DEFAULT_FAVORITE_IDS],
  }
}

export function normalizeDemoState(value) {
  return {
    favoritePortletIds: normalizeDemoFavoriteIds(value?.favoritePortletIds),
  }
}

function getDemoApplicationPortlets(ids = []) {
  return ids
    .map((id) => DEMO_APPLICATIONS_BY_ID.get(id))
    .filter(Boolean)
    .map((application) => ({
      _objectType: 'portlet',
      ID: application.id,
      nodeId: application.id,
      chanID: application.id,
      fname: application.fname,
      title: application.title,
      name: application.title,
      description: application.description,
      portletName: 'app-launcher',
      typeID: '2',
      parameters: {
        launchUrl: application.href,
        description: application.description,
        target: application.target,
        stopImmediately: application.target === '_blank' ? 'true' : 'false',
      },
      widgetURL: application.href,
      url: application.href,
      target: application.target,
    }))
}

export function buildDemoLayoutData(demoStateInput) {
  const demoState = normalizeDemoState(demoStateInput)
  const favoritePortlets = getDemoApplicationPortlets(demoState.favoritePortletIds)
  const allPortlets = getDemoApplicationPortlets(DEMO_APPLICATIONS.map((application) => application.id))

  return {
    authenticated: 'true',
    user: DEMO_ACCOUNT.preferred_username,
    layout: {
      globals: {
        hasFavorites: 'true',
      },
      navigation: {
        tabs: [
          {
            ID: 'demo-tab-services',
            name: 'Services',
            content: [
              {
                _objectType: 'folder',
                ID: 'demo-folder-favorites',
                name: 'Favoris',
                content: favoritePortlets,
              },
              {
                _objectType: 'folder',
                ID: 'demo-folder-services',
                name: 'Toutes les applications',
                content: allPortlets,
              },
            ],
          },
        ],
        favorites: favoritePortlets,
      },
      favorites: favoritePortlets,
    },
  }
}

export function buildDemoLayoutDocData() {
  return DEMO_APPLICATIONS.map((application) => ({
    ID: application.id,
    nodeId: application.id,
    fname: application.fname,
    title: application.title,
    name: application.title,
    description: application.description,
    portletName: 'app-launcher',
    typeID: '2',
    parameters: {
      launchUrl: application.href,
      description: application.description,
      target: application.target,
      stopImmediately: application.target === '_blank' ? 'true' : 'false',
    },
    widgetURL: application.href,
    url: application.href,
    target: application.target,
  }))
}

export function buildDemoMarketplaceEntries() {
  return []
}

export function buildDemoPortletFragment(fname) {
  const application = DEMO_APPLICATIONS_BY_FNAME.get(String(fname ?? '').trim())
  if (!application) {
    return null
  }

  return `<div class="demo-portlet-fragment"><a href="${escapeHtml(application.href)}" target="${escapeHtml(application.target)}" rel="noreferrer">${escapeHtml(application.title)}</a></div>`
}

export function buildDemoPortletMetadata(fname) {
  const application = DEMO_APPLICATIONS_BY_FNAME.get(String(fname ?? '').trim())
  if (!application) {
    return null
  }

  return {
    ID: application.id,
    nodeId: application.id,
    fname: application.fname,
    title: application.title,
    name: application.title,
    description: application.description,
    portletName: 'app-launcher',
    typeID: '2',
    parameters: {
      launchUrl: application.href,
      description: application.description,
      target: application.target,
      stopImmediately: application.target === '_blank' ? 'true' : 'false',
    },
    widgetURL: application.href,
    url: application.href,
    target: application.target,
  }
}

function insertAfter(list, targetValue, nextValue) {
  const nextList = [...list]
  const targetIndex = nextList.indexOf(targetValue)

  if (targetIndex !== -1) {
    return nextList
  }

  if (nextValue && nextList.includes(nextValue)) {
    nextList.splice(nextList.indexOf(nextValue), 0, targetValue)
    return nextList
  }

  nextList.push(targetValue)
  return nextList
}

export function applyDemoLayoutMutation(requestPath, demoStateInput) {
  const demoState = normalizeDemoState(demoStateInput)
  const requestUrl = new URL(String(requestPath ?? '/api/layout'), 'https://demo.l-ent.local')

  if (requestUrl.pathname !== '/api/layout') {
    return {
      handled: false,
      demoState,
    }
  }

  const sourceId = String(
    requestUrl.searchParams.get('sourceId')
      || requestUrl.searchParams.get('sourceID')
      || '',
  ).trim()

  if (!DEMO_APPLICATIONS_BY_ID.has(sourceId)) {
    return {
      handled: true,
      demoState,
    }
  }

  const favoritePortletIds = demoState.favoritePortletIds.includes(sourceId)
    ? demoState.favoritePortletIds.filter((id) => id !== sourceId)
    : insertAfter(
      demoState.favoritePortletIds,
      sourceId,
      String(requestUrl.searchParams.get('nextNodeId') || '').trim(),
    )

  return {
    handled: true,
    demoState: normalizeDemoState({ favoritePortletIds }),
    payload: {
      ok: true,
      action: requestUrl.searchParams.get('action') || 'toggleFavorite',
      favoritePortletIds,
    },
  }
}

function findDemoTreeNodeById(node, targetId) {
  if (!node) {
    return null
  }

  if (String(node.id) === String(targetId)) {
    return node
  }

  for (const child of node.children ?? []) {
    const match = findDemoTreeNodeById(child, targetId)
    if (match) {
      return match
    }
  }

  return null
}

function findDemoTreePathIds(node, targetId, currentPath = []) {
  if (!node) {
    return null
  }

  const nextPath = [...currentPath, String(node.id)]
  if (String(node.id) === String(targetId)) {
    return nextPath
  }

  for (const child of node.children ?? []) {
    const match = findDemoTreePathIds(child, targetId, nextPath)
    if (match) {
      return match
    }
  }

  return null
}

function collectDemoTreeNodes(node, collector) {
  if (!node) {
    return
  }

  collector.push(node)

  for (const child of node.children ?? []) {
    collectDemoTreeNodes(child, collector)
  }
}

export function buildDemoAdeTreePayload(requestedResourceId = '') {
  const normalizedRequestedResourceId = String(requestedResourceId ?? '').trim()
  const hasRequestedResource = normalizedRequestedResourceId && findDemoTreeNodeById(DEMO_TREE_ROOT, normalizedRequestedResourceId)
  const focusResourceId = hasRequestedResource ? normalizedRequestedResourceId : DEMO_DEFAULT_TREE_PATH[DEMO_DEFAULT_TREE_PATH.length - 1]
  const currentPathIds = findDemoTreePathIds(DEMO_TREE_ROOT, focusResourceId) ?? [...DEMO_DEFAULT_TREE_PATH]

  return {
    source: 'demo',
    root: cloneDemoValue(DEMO_TREE_ROOT),
    currentResourceId: currentPathIds[currentPathIds.length - 1] ?? null,
    focusResourceId,
    currentPathIds,
  }
}

export function searchDemoAdeTree(query) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase()
  if (!normalizedQuery) {
    return []
  }

  const nodes = []
  collectDemoTreeNodes(DEMO_TREE_ROOT, nodes)

  return nodes
    .filter((node) => {
      const haystack = [node.name, node.path, node.id].join(' | ').toLowerCase()
      return haystack.includes(normalizedQuery) && String(node.id) !== '-100'
    })
    .map((node) => ({
      id: String(node.id),
      name: node.name,
      path: node.path,
      childrenCount: Array.isArray(node.children) ? node.children.length : 0,
    }))
}

function parseDateOnly(dateString) {
  const rawValue = String(dateString ?? '').trim()
  if (!rawValue) {
    return new Date()
  }

  const parts = rawValue.split('-').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return new Date(rawValue)
  }

  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0)
}

function formatDateOnly(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(date) {
  const nextDate = new Date(date)
  nextDate.setHours(0, 0, 0, 0)
  const currentDay = nextDate.getDay()
  const shift = currentDay === 0 ? -6 : 1 - currentDay
  nextDate.setDate(nextDate.getDate() + shift)
  return nextDate
}

function addDays(date, amount) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return nextDate
}

function makeLocalDateTime(date, hours, minutes) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    0,
    0,
  )
}

function getSelectionLabel(selection = null) {
  return selection?.tpLabel
    || selection?.tdLabel
    || selection?.yearLabel
    || 'TP 1'
}

function buildDemoEventsForWeek(anchorDate, selectionLabel) {
  const weekStart = startOfWeek(anchorDate)

  return DEMO_SCHEDULE_TEMPLATES.map((template) => {
    const eventDate = addDays(weekStart, template.dayOffset)
    const start = makeLocalDateTime(eventDate, template.startHour, template.startMinute)
    const end = new Date(start.getTime() + template.durationMinutes * 60 * 1000)

    return {
      id: `${template.key}-${formatDateOnly(start)}`,
      title: template.title,
      teacher: template.teacher,
      location: template.location,
      description: template.title,
      groups: [selectionLabel],
      start: start.toISOString(),
      end: end.toISOString(),
    }
  })
}

function normalizeSelectionFromResource(resourceId = '') {
  const normalizedResourceId = String(resourceId ?? '').trim()
  const currentPathIds = findDemoTreePathIds(DEMO_TREE_ROOT, normalizedResourceId) ?? DEMO_DEFAULT_TREE_PATH
  const selectedNode = findDemoTreeNodeById(DEMO_TREE_ROOT, currentPathIds[currentPathIds.length - 1])

  return {
    resourceId: selectedNode ? String(selectedNode.id) : DEMO_DEFAULT_TREE_PATH[DEMO_DEFAULT_TREE_PATH.length - 1],
    label: selectedNode?.name ?? 'TP 1',
  }
}

function buildWeekLabel(weekStart) {
  const weekEnd = addDays(weekStart, 4)
  return `Semaine du ${formatDateOnly(weekStart)} au ${formatDateOnly(weekEnd)}`
}

export function buildDemoTimetablePayload({ date, resourceId } = {}) {
  const anchorDate = parseDateOnly(date || formatDateOnly(new Date()))
  const resolvedSelection = normalizeSelectionFromResource(resourceId)
  const weekStart = startOfWeek(anchorDate)
  const events = buildDemoEventsForWeek(anchorDate, resolvedSelection.label)

  return {
    source: 'demo',
    date: formatDateOnly(anchorDate),
    resourceId: resolvedSelection.resourceId,
    weekLabel: buildWeekLabel(weekStart),
    resolvedWeek: {
      label: buildWeekLabel(weekStart),
      start: formatDateOnly(weekStart),
      end: formatDateOnly(addDays(weekStart, 6)),
      current: formatDateOnly(startOfWeek(new Date())) === formatDateOnly(weekStart),
    },
    outOfRange: false,
    dayLabels: Array.from({ length: 5 }, (_, index) => formatDateOnly(addDays(weekStart, index))),
    events,
  }
}

export function buildDemoPlanningPayload({ date, resourceId } = {}) {
  const timetable = buildDemoTimetablePayload({ date, resourceId })
  return {
    events: timetable.events,
    weekLabel: timetable.weekLabel,
    dayLabels: timetable.dayLabels,
    resolvedWeek: timetable.resolvedWeek,
    outOfRange: timetable.outOfRange,
  }
}

export function buildDemoCalendarPayload({ date, resourceId } = {}) {
  const anchorDate = parseDateOnly(date || formatDateOnly(new Date()))
  const weekStart = startOfWeek(anchorDate)
  const resolvedSelection = normalizeSelectionFromResource(resourceId)
  const weeks = Array.from({ length: 6 }, (_, index) => {
    const currentWeekStart = addDays(weekStart, index * 7)
    const currentWeekEnd = addDays(currentWeekStart, 6)

    return {
      index,
      label: buildWeekLabel(currentWeekStart),
      start: formatDateOnly(currentWeekStart),
      end: formatDateOnly(currentWeekEnd),
      current: index === 0,
    }
  })

  return {
    source: 'demo',
    resourceId: resolvedSelection.resourceId,
    currentResourceId: resolvedSelection.resourceId,
    requestedResourceId: String(resourceId ?? '').trim() || resolvedSelection.resourceId,
    targetDate: formatDateOnly(anchorDate),
    targetDateMatched: true,
    outOfRange: false,
    matchedWeek: weeks[0],
    currentWeek: weeks[0],
    firstWeek: weeks[0],
    lastWeek: weeks[weeks.length - 1],
    weekCount: weeks.length,
    weeks,
  }
}

export function buildDemoUpcomingPayload({ date, lookaheadDays = 14, selection = null } = {}) {
  const requestedDate = parseDateOnly(date || formatDateOnly(new Date()))
  const selectionLabel = getSelectionLabel(selection)
  const upcomingEvents = [
    ...buildDemoEventsForWeek(requestedDate, selectionLabel),
    ...buildDemoEventsForWeek(addDays(requestedDate, 7), selectionLabel),
  ]
    .filter((event) => {
      const eventStart = new Date(event.start)
      const maxDate = addDays(requestedDate, lookaheadDays)
      return eventStart >= requestedDate && eventStart <= maxDate
    })
    .sort((left, right) => left.start.localeCompare(right.start))

  return {
    source: 'demo',
    date: formatDateOnly(requestedDate),
    lookaheadDays,
    complete: true,
    resourceIds: [
      selection?.tpResourceId,
      selection?.tdResourceId,
      selection?.yearResourceId,
      selection?.resourceId,
    ].filter(Boolean).map((value) => String(value)),
    selectionLabels: [selectionLabel],
    events: upcomingEvents,
    nextEvent: upcomingEvents[0] ?? null,
  }
}

export function buildDemoAlertsPayload() {
  return [
    {
      level: 'info',
      title: 'Mode démo',
      message: 'Certaines applications ouvrent des pages publiques pour illustrer le parcours.',
    },
  ]
}

// Demo ScoDoc data, shaped like the notes9 passerelle answers (ScoDoc 9 BUT
// bulletin): evaluation notes are on /20 and note.min/moy/max are promo
// stats; module averages are left empty, as ScoDoc does for BUT.
const DEMO_GRADES_SEMESTERS = Object.freeze([
  { formsemestre_id: 9104, titre: 'BUT MMI', annee_scolaire: '2025/2026', semestre_id: 4 },
  { formsemestre_id: 9105, titre: 'BUT MMI', annee_scolaire: '2026/2027', semestre_id: 5 },
])

export const DEMO_GRADES_DEPARTMENT_MESSAGE = '<p>Les jurys du semestre 5 auront lieu le <b>28 janvier</b>.<br>Pensez à vérifier vos notes et à signaler toute erreur à votre enseignant avant le 20 janvier.</p>'

function buildDemoEvaluation(id, { description, date, coef = '1.00', type = 0, weights, value, min, moy, max }) {
  return {
    id,
    description,
    date,
    date_debut: `${date}T08:15:00`,
    date_fin: `${date}T10:15:00`,
    coef: type === 0 ? coef : null,
    evaluation_type: type,
    poids: weights,
    note: { value, min, moy, max },
    url: '',
  }
}

function buildDemoStudent() {
  return {
    prenom: 'Camille',
    nom: 'MARTIN',
    civilite: 'X',
    dept_acronym: 'MMI',
    photo_url: '/ScoDoc/MMI/api/etudiant/photo',
  }
}

const DEMO_FORMATION = Object.freeze({
  acronyme: 'BUT MMI',
  titre: "BUT Métiers du Multimédia et de l'Internet",
  titre_officiel: "Bachelor Universitaire de Technologie Métiers du Multimédia et de l'Internet",
})

const DEMO_OPTIONS = Object.freeze({
  show_abs: true,
  show_ects: true,
  show_minmax: true,
  show_moypromo: true,
  show_rangs: true,
  show_ue_rangs: true,
})

function buildDemoS5Releve() {
  return {
    version: '0',
    type: 'BUT',
    date: '2026-10-14T08:00:00Z',
    publie: true,
    etat_inscription: 'I',
    etudiant: buildDemoStudent(),
    formation: DEMO_FORMATION,
    formsemestre_id: 9105,
    options: DEMO_OPTIONS,
    ressources: {
      'R5.07': {
        id: 51007,
        titre: 'UX Writing',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70101, { description: 'Atelier persona', date: '2026-09-17', weights: { 'UE5.1': 1, 'UE5.2': 0.5 }, value: '14.00', min: '6.50', moy: '12.60', max: '18.00' }),
          buildDemoEvaluation(70102, { description: 'Audit éditorial', date: '2026-10-06', coef: '2.00', weights: { 'UE5.1': 1, 'UE5.2': 1 }, value: '17.00', min: '8.00', moy: '13.90', max: '19.00' }),
        ],
      },
      'R5.11': {
        id: 51011,
        titre: 'Développement Front',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70111, { description: 'Composants React', date: '2026-09-24', coef: '2.00', weights: { 'UE5.3': 1 }, value: '16.00', min: '4.00', moy: '12.50', max: '19.50' }),
          buildDemoEvaluation(70112, { description: 'Accessibilité UI', date: '2026-10-09', weights: { 'UE5.3': 1 }, value: '18.00', min: '9.00', moy: '13.20', max: '18.50' }),
        ],
      },
      'R5.04': {
        id: 51004,
        titre: 'Gestion de projet',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70141, { description: 'Note de cadrage', date: '2026-09-22', weights: { 'UE5.1': 1 }, value: '11.50', min: '5.00', moy: '11.80', max: '16.00' }),
          buildDemoEvaluation(70142, { description: 'Soutenance de cadrage', date: '2026-10-13', weights: { 'UE5.1': 1 }, value: '~', min: '', moy: '', max: '' }),
        ],
      },
      'R5.02': {
        id: 51002,
        titre: 'Anglais',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70121, { description: 'Compréhension écrite', date: '2026-09-15', weights: { 'UE5.2': 1 }, value: 'ABS', min: '7.00', moy: '13.10', max: '18.00' }),
          buildDemoEvaluation(70122, { description: 'Oral : pitch produit', date: '2026-10-01', weights: { 'UE5.2': 1 }, value: '12.75', min: '8.25', moy: '12.40', max: '17.50' }),
          buildDemoEvaluation(70123, { description: 'Compréhension écrite (rattrapage)', date: '2026-10-08', type: 1, weights: { 'UE5.2': 1 }, value: '13.50', min: '9.00', moy: '11.00', max: '13.50' }),
        ],
      },
      'R5.09': {
        id: 51009,
        titre: 'Culture numérique',
        moyenne: {},
        evaluations: [],
      },
    },
    saes: {
      'SAÉ 5.01': {
        id: 52001,
        titre: 'Prototype interactif',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70201, { description: 'Sprint review', date: '2026-09-30', coef: '2.00', weights: { 'UE5.1': 0.5, 'UE5.3': 1 }, value: '15.50', min: '9.50', moy: '12.70', max: '17.00' }),
          buildDemoEvaluation(70202, { description: 'Démo client', date: '2026-10-10', weights: { 'UE5.1': 1, 'UE5.3': 1 }, value: '14.00', min: '7.00', moy: '12.10', max: '16.50' }),
        ],
      },
      'SAÉ 5.02': {
        id: 52002,
        titre: 'Portfolio',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(70211, { description: 'Revue de portfolio', date: '2026-10-02', weights: { 'UE5.2': 1 }, value: '9.50', min: '5.50', moy: '11.40', max: '16.00' }),
        ],
      },
    },
    ues: {
      'UE5.1': {
        id: 5001,
        titre: 'Concevoir une réponse stratégique',
        numero: 1,
        type: 0,
        color: '#b80004',
        competence: null,
        moyenne: { value: '14.62', min: '6.90', max: '17.80', moy: '12.40', rang: '12', total: 84 },
        bonus: null,
        malus: null,
        capitalise: null,
        ressources: {
          'R5.07': { id: 51007, coef: 3, moyenne: '15.33' },
          'R5.04': { id: 51004, coef: 2, moyenne: '11.50' },
        },
        saes: {
          'SAÉ 5.01': { id: 52001, coef: 4, moyenne: '14.60' },
        },
        ECTS: { acquis: 0, total: 10 },
      },
      'UE5.2': {
        id: 5002,
        titre: 'Exprimer un message',
        numero: 2,
        type: 0,
        color: '#f97b3d',
        competence: null,
        moyenne: { value: '12.48', min: '5.10', max: '16.90', moy: '12.05', rang: '38', total: 84 },
        bonus: null,
        malus: null,
        capitalise: null,
        ressources: {
          'R5.07': { id: 51007, coef: 2, moyenne: '15.80' },
          'R5.02': { id: 51002, coef: 2, moyenne: '13.13' },
          'R5.09': { id: 51009, coef: 1, moyenne: '' },
        },
        saes: {
          'SAÉ 5.02': { id: 52002, coef: 3, moyenne: '9.50' },
        },
        ECTS: { acquis: 0, total: 10 },
      },
      'UE5.3': {
        id: 5003,
        titre: 'Développer pour le web',
        numero: 3,
        type: 0,
        color: '#feb40b',
        competence: null,
        moyenne: { value: '15.96', min: '7.40', max: '18.20', moy: '12.88', rang: '6', total: 84 },
        bonus: '0.10',
        malus: null,
        capitalise: null,
        ressources: {
          'R5.11': { id: 51011, coef: 4, moyenne: '16.67' },
        },
        saes: {
          'SAÉ 5.01': { id: 52001, coef: 4, moyenne: '15.00' },
        },
        ECTS: { acquis: 0, total: 10 },
      },
    },
    semestre: {
      numero: 5,
      annee_universitaire: '2026/2027',
      date_debut: '2026-09-01',
      date_fin: '2027-01-24',
      inscription: '',
      groupes: [
        { group_name: 'TD B', partition: { partition_name: 'TD' } },
        { group_name: 'TP 3', partition: { partition_name: 'TP' } },
      ],
      notes: { value: '14.35', min: '7.84', moy: '12.44', max: '17.40' },
      rang: { value: '9', total: 84 },
      ECTS: { acquis: 0, total: 30 },
      absences: { injustifie: 2, total: 6, metrique: 'H.' },
    },
    appreciation: [],
  }
}

function buildDemoS4Releve() {
  return {
    version: '0',
    type: 'BUT',
    date: '2026-06-30T08:00:00Z',
    publie: true,
    etat_inscription: 'I',
    etudiant: buildDemoStudent(),
    formation: DEMO_FORMATION,
    formsemestre_id: 9104,
    options: DEMO_OPTIONS,
    ressources: {
      'R4.01': {
        id: 41001,
        titre: 'Stratégie de communication',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(60101, { description: 'Recommandation stratégique', date: '2026-02-12', coef: '2.00', weights: { 'UE4.1': 1 }, value: '13.00', min: '6.00', moy: '11.90', max: '17.00' }),
          buildDemoEvaluation(60102, { description: 'QCM', date: '2026-03-19', weights: { 'UE4.1': 1 }, value: '15.25', min: '5.50', moy: '12.30', max: '19.00' }),
        ],
      },
      'R4.08': {
        id: 41008,
        titre: 'Développement back',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(60181, { description: 'API REST', date: '2026-03-05', coef: '2.00', weights: { 'UE4.2': 1 }, value: '16.50', min: '3.00', moy: '11.60', max: '19.00' }),
        ],
      },
    },
    saes: {
      'SAÉ 4.01': {
        id: 42001,
        titre: 'Site e-commerce',
        moyenne: {},
        evaluations: [
          buildDemoEvaluation(60201, { description: 'Soutenance finale', date: '2026-05-28', coef: '3.00', weights: { 'UE4.1': 1, 'UE4.2': 1 }, value: '15.00', min: '8.00', moy: '12.80', max: '18.00' }),
        ],
      },
    },
    ues: {
      'UE4.1': {
        id: 4001,
        titre: 'Concevoir une réponse stratégique',
        numero: 1,
        type: 0,
        color: '#b80004',
        moyenne: { value: '14.55', min: '7.20', max: '17.60', moy: '12.30', rang: '15', total: 86 },
        ressources: { 'R4.01': { id: 41001, coef: 3, moyenne: '13.75' } },
        saes: { 'SAÉ 4.01': { id: 42001, coef: 4, moyenne: '15.00' } },
        ECTS: { acquis: 15, total: 15 },
      },
      'UE4.2': {
        id: 4002,
        titre: 'Développer pour le web',
        numero: 2,
        type: 0,
        color: '#feb40b',
        moyenne: { value: '15.64', min: '6.10', max: '18.40', moy: '12.20', rang: '8', total: 86 },
        ressources: { 'R4.08': { id: 41008, coef: 4, moyenne: '16.50' } },
        saes: { 'SAÉ 4.01': { id: 42001, coef: 4, moyenne: '15.00' } },
        ECTS: { acquis: 15, total: 15 },
      },
    },
    semestre: {
      numero: 4,
      annee_universitaire: '2025/2026',
      date_debut: '2026-01-19',
      date_fin: '2026-06-30',
      groupes: [{ group_name: 'TD B', partition: { partition_name: 'TD' } }],
      notes: { value: '15.08', min: '7.60', moy: '12.25', max: '17.90' },
      rang: { value: '11', total: 86 },
      ECTS: { acquis: 30, total: 30 },
      absences: { injustifie: 0, total: 2, metrique: 'H.' },
    },
    appreciation: [{ comment: 'Très bon semestre, travail régulier et sérieux.' }],
  }
}

function buildDemoS5Absences() {
  return {
    '2026-09-25': [
      { debut: 8.25, fin: 10.25, statut: 'absent', justifie: false, enseignant: 'thomas.lemoine@univ-rennes.fr', matiereComplet: 51011 },
    ],
    '2026-09-29': [
      { debut: 13.5, fin: 15.5, statut: 'absent', justifie: true, enseignant: 'anne.lefur@univ-rennes.fr', matiereComplet: 52001 },
    ],
    '2026-10-06': [
      { debut: 10.25, fin: 10.5, statut: 'retard', justifie: false, enseignant: 'julie.morvan@univ-rennes.fr', matiereComplet: 'R5.02 - Anglais' },
      { debut: 14, fin: 16, statut: 'absent', justifie: true, enseignant: 'thomas.lemoine@univ-rennes.fr', matiereComplet: 51011 },
    ],
  }
}

const DEMO_GRADES_CONFIG = Object.freeze({
  releve_PDF: false,
  afficher_absences: true,
  liste_dep_publi_absences: '',
  metrique_absences: 'heure',
  message_rapport_absences: "Les causes de l’absence doivent être notifiées par écrit à l'aide d'un justificatif dans les 48 heures à compter du début de l’absence au secrétariat du département.",
  liste_dep_affichage_appreciations: 'MMI',
  autoriser_justificatifs: false,
})

export function buildDemoGradesPayload() {
  return {
    auth: { session: 'demo', statut: 10 },
    config: DEMO_GRADES_CONFIG,
    semestres: DEMO_GRADES_SEMESTERS.map((semester) => ({ ...semester })),
    'relevé': buildDemoS5Releve(),
    absences: buildDemoS5Absences(),
  }
}

export function buildDemoSemesterGradesPayload(semesterId) {
  const releves = {
    9104: () => ({ 'relevé': buildDemoS4Releve(), absences: {} }),
    9105: () => ({ 'relevé': buildDemoS5Releve(), absences: buildDemoS5Absences() }),
  }
  const build = releves[String(semesterId)]

  return build ? { config: DEMO_GRADES_CONFIG, ...build() } : null
}

// Demo inbox for the "Mails récents" widget. `minutesAgo` is resolved against
// the request time so the widget always shows fresh-looking relative dates.
const DEMO_MAIL_MESSAGES = Object.freeze([
  {
    id: 'demo-mail-1',
    minutesAgo: 12,
    unread: true,
    from: { name: 'Thomas Lemoine', email: 'thomas.lemoine@univ-rennes.fr' },
    subject: 'R5.11 – Rendu du TP React décalé à vendredi',
    snippet: 'Bonjour à tous, suite aux soucis de serveur de mardi, le rendu du TP 4 (composants et état) est repoussé à vendredi 18h sur Moodle. Pensez à…',
  },
  {
    id: 'demo-mail-2',
    minutesAgo: 95,
    unread: true,
    from: { name: 'Scolarité IUT de Lannion', email: 'scolarite-iut-lannion@univ-rennes.fr' },
    subject: 'Inscriptions pédagogiques S6 : ouverture le 14 octobre',
    snippet: 'Madame, Monsieur, les inscriptions pédagogiques du semestre 6 seront ouvertes du 14 au 25 octobre via votre dossier étudiant. Le choix des parcours…',
  },
  {
    id: 'demo-mail-3',
    minutesAgo: 60 * 5 + 20,
    unread: false,
    from: { name: 'Moodle UR', email: 'noreply-moodle@univ-rennes.fr' },
    subject: 'Nouveau devoir : SAE Prototype interactif – Livrable 2',
    snippet: 'Mme Le Fur a publié un nouveau devoir dans le cours « SAE Prototype interactif ». Date limite : lundi 23:59. Consultez les consignes détaillées…',
  },
  {
    id: 'demo-mail-4',
    minutesAgo: 60 * 22,
    unread: true,
    from: { name: 'BU Lannion', email: 'bu-lannion@univ-rennes.fr' },
    subject: 'Rappel : 2 documents à rendre avant le 10/10',
    snippet: 'Bonjour Camille, nous vous rappelons que les documents suivants arrivent à échéance : « Design emotionnel » (D. Norman), « Refactoring UI »…',
  },
  {
    id: 'demo-mail-5',
    minutesAgo: 60 * 28,
    unread: false,
    from: { name: 'BDE MMI Lannion', email: 'bde.mmi.lannion@gmail.com' },
    subject: 'Soirée d’intégration jeudi 🎉 dernières places',
    snippet: 'Salut les MMI ! Il reste une vingtaine de places pour la soirée de jeudi au Quai des Bulles. Inscription et paiement sur le HelloAsso avant mercredi…',
  },
])

// Demo sessions open the same demo webmail as the "Messagerie" app tile,
// never the real university webmail.
const DEMO_WEBMAIL_HREF = DEMO_APPLICATIONS.find((application) => application.id === 'demo-mail')?.href ?? null

export function buildDemoMailPayload({ now = Date.now(), webmailHref = DEMO_WEBMAIL_HREF } = {}) {
  const messages = DEMO_MAIL_MESSAGES.map(({ minutesAgo, ...message }) => ({
    ...cloneDemoValue(message),
    receivedAt: new Date(now - minutesAgo * 60 * 1000).toISOString(),
    href: null,
  }))

  return {
    unreadCount: 7,
    webmailHref,
    messages,
  }
}

// Demo deadlines for the "Échéances Moodle" widget. `hoursFromNow` is resolved
// against the request time (negative = overdue) so dates always look current.
const DEMO_MOODLE_DEADLINES = Object.freeze([
  {
    id: 'demo-moodle-tp3-api',
    hoursFromNow: -2 * 24 - 3,
    title: 'TP 3 – API REST avec Express',
    courseName: 'R5.12 Développement back-end',
    type: 'assign',
    submitted: false,
  },
  {
    id: 'demo-moodle-sae501-livrable2',
    hoursFromNow: 4,
    title: 'Rendu SAE 501 – Livrable 2',
    courseName: 'SAE 5.01 Développement web',
    type: 'assign',
    submitted: false,
  },
  {
    id: 'demo-moodle-qcm-rgaa',
    hoursFromNow: 24 + 2,
    title: 'QCM – Accessibilité et RGAA',
    courseName: 'R5.03 Accessibilité numérique',
    type: 'quiz',
    submitted: false,
  },
  {
    id: 'demo-moodle-forum-maquettes',
    hoursFromNow: 3 * 24 + 5,
    title: 'Forum : retours croisés sur les maquettes',
    courseName: 'R5.07 Design d’interaction',
    type: 'forum',
    submitted: null,
  },
  {
    id: 'demo-moodle-veille',
    hoursFromNow: 7 * 24,
    title: 'Dossier de veille technologique',
    courseName: 'R5.06 Culture numérique',
    type: 'assign',
    submitted: true,
  },
  {
    id: 'demo-moodle-sondage-s5',
    hoursFromNow: 10 * 24 + 6,
    title: 'Questionnaire de mi-semestre S5',
    courseName: 'BUT MMI 3 – Vie de promo',
    type: 'other',
    submitted: null,
  },
])

// Demo sessions open the demo "Moodle" app tile, never the real Moodle.
const DEMO_MOODLE_HREF = DEMO_APPLICATIONS.find((application) => application.id === 'demo-moodle')?.href ?? null

export function buildDemoMoodleDeadlinesPayload({ now = Date.now(), moodleHref = DEMO_MOODLE_HREF } = {}) {
  const quarterHourMs = 15 * 60 * 1000
  const items = DEMO_MOODLE_DEADLINES.map(({ hoursFromNow, ...deadline }) => {
    // Round to the next quarter hour so due times look like real deadlines.
    const dueAtMs = Math.ceil((now + hoursFromNow * 60 * 60 * 1000) / quarterHourMs) * quarterHourMs
    return {
      ...cloneDemoValue(deadline),
      dueAt: new Date(dueAtMs).toISOString(),
      overdue: dueAtMs < now,
      href: null,
    }
  }).sort((left, right) => left.dueAt.localeCompare(right.dueAt))

  return { moodleHref, items }
}
