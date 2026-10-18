// ============================================================================
// Anonymous analytics allowlist — the ONLY place that defines what l'ent may
// send to PostHog (see docs/ANALYTICS.md).
//
// Every event the browser posts to /__ent_auth/analytics goes through
// sanitizeAnalyticsBatch(): unknown events are dropped, unknown properties are
// dropped, and every kept value must match an enum, a short slug pattern or a
// boolean. There is no free-text property on purpose: no titles, names,
// subjects, URLs, grades or search text can ever get through.
//
// Adding an event or property means editing this file AND docs/ANALYTICS.md.
// ============================================================================

export const ANALYTICS_MAX_BODY_BYTES = 8 * 1024
export const ANALYTICS_MAX_EVENTS_PER_BATCH = 20

const WIDGET_IDS = ['greeting', 'nextClass', 'latestGrade', 'mail', 'deadlines']
export const DURATION_BUCKETS = ['<500ms', '<1s', '<3s', '<10s', '10s+']
const ERROR_KINDS = ['http_4xx', 'http_5xx', 'network', 'timeout', 'other']
// How the student arrived on « Mes notes » (see src/gradesAnalytics.js).
const GRADES_PAGE_SOURCES = ['nav', 'tabbar', 'tile', 'dashboard_card', 'sidebar_card', 'launch_card', 'history', 'other']
const GRADES_ACTIONS = ['semester_changed', 'ue_view_opened', 'grade_detail_opened', 'pdf_downloaded', 'explainer_opened', 'department_message_expanded']
const SIMULATOR_STEPS = ['opened', 'ue_picked', 'reveal_shown', 'back_to_edit', 'closed']
// The simulator's outcome, sent with reveal_shown only. Never a grade, an
// average or a delta: how many grades were changed (bucketed), which way
// the UE went and whether it ends up validated.
const SIMULATOR_REVEAL_PROPERTIES = ['edited_bucket', 'added_grades', 'ue_direction', 'ue_validated', 'crossed_pass_mark']

const oneOf = (...values) => (value) => (values.includes(value) ? value : undefined)
const boolean = (value) => (typeof value === 'boolean' ? value : undefined)
const slug = (maxLength) => {
  const pattern = new RegExp(`^[a-z0-9-]{1,${maxLength}}$`)
  return (value) => (typeof value === 'string' && pattern.test(value) ? value : undefined)
}

// Coarse context the client attaches to every event. `university` and `demo`
// are NOT accepted from the client: the server sets them from its own config
// and from the session (see server/analytics.js).
export const CONTEXT_PROPERTIES = {
  device: oneOf('mobile', 'tablet', 'desktop'),
  browser: oneOf('chromium', 'firefox', 'safari', 'other'),
  standalone: boolean,
  lang: (value) => (typeof value === 'string' && /^[a-z]{2}$/.test(value) ? value : undefined),
  // Establishment id from the university config (e.g. "iutlan"): large groups.
  establishment: slug(16),
  // Formation slug from the ADE selection (e.g. "but-mmi"): never year/TD/TP.
  formation: slug(32),
}

// event name → { properties, required, refine, allowWithoutSession }
//   properties: allowed event-specific properties and their validators
//   required: properties without which the event is dropped
//   refine(props): cross-property rules; return null to drop the event
//   allowWithoutSession: accepted from visitors without a session (they get
//     a one-off random distinct id, see server/analytics.js)
export const ANALYTICS_EVENTS = {
  dashboard_viewed: {
    properties: {},
  },
  widget_loaded: {
    properties: {
      widget: oneOf(...WIDGET_IDS),
      status: oneOf('ok', 'empty', 'error'),
      duration_bucket: oneOf(...DURATION_BUCKETS),
      error_kind: oneOf(...ERROR_KINDS),
    },
    required: ['widget', 'status'],
    refine: (props) => {
      if (props.status !== 'error') delete props.error_kind
      return props
    },
  },
  app_opened: {
    properties: {
      app: slug(64),
      source: oneOf('grid', 'favorites', 'sidebar', 'tabbar'),
      // The grade service's app opened « Mes notes » instead of ScoDoc.
      in_app: boolean,
    },
    required: ['app', 'source'],
  },
  setting_changed: {
    properties: {
      setting: oneOf('widget_visibility', 'app_descriptions', 'custom_background', 'wallpaper', 'theme', 'analytics'),
      value: oneOf('on', 'off', 'auto', 'light', 'dark'),
      widget: oneOf(...WIDGET_IDS),
    },
    required: ['setting', 'value'],
    refine: (props) => {
      // Turning analytics off must not be reported at all.
      if (props.setting === 'analytics' && props.value === 'off') return null
      // The theme reports which one was picked; every other setting is on/off.
      const isThemeValue = ['auto', 'light', 'dark'].includes(props.value)
      if ((props.setting === 'theme') !== isThemeValue) return null
      if (props.setting === 'widget_visibility') {
        return props.widget ? props : null
      }
      delete props.widget
      return props
    },
  },
  login_result: {
    properties: {
      result: oneOf('success', 'failure'),
      demo: boolean,
    },
    required: ['result'],
    allowWithoutSession: true,
  },
  pwa_update_applied: {
    properties: {},
    allowWithoutSession: true,
  },
  // Arrival from the old l'ent address (see src/settingsTransferBoot.js).
  // Usually before signing in, hence allowed without a session.
  settings_imported: {
    properties: {
      has_settings: boolean,
    },
    required: ['has_settings'],
    allowWithoutSession: true,
  },
  // « Mes notes »: one per arrival on the page (not per re-render).
  page_viewed: {
    properties: {
      page: oneOf('grades'),
      source: oneOf(...GRADES_PAGE_SOURCES),
    },
    required: ['page', 'source'],
  },
  // The semester « Mes notes » opens on, once per arrival. `unsupported`: a
  // relevé that isn't a BUT one, or no ScoDoc relevé at all.
  grades_loaded: {
    properties: {
      status: oneOf('ok', 'empty', 'unpublished', 'unsupported', 'error'),
      duration_bucket: oneOf(...DURATION_BUCKETS),
      error_kind: oneOf(...ERROR_KINDS),
    },
    required: ['status'],
    refine: (props) => {
      if (props.status !== 'error') delete props.error_kind
      return props
    },
  },
  grades_action: {
    properties: {
      action: oneOf(...GRADES_ACTIONS),
      // Where a grade's detail sheet was opened from.
      from: oneOf('latest', 'ue_view', 'subjects', 'dashboard'),
    },
    required: ['action'],
    refine: (props) => {
      if (props.action !== 'grade_detail_opened') delete props.from
      return props
    },
  },
  simulator_step: {
    properties: {
      step: oneOf(...SIMULATOR_STEPS),
      edited_bucket: oneOf('1', '2-3', '4+'),
      added_grades: boolean,
      ue_direction: oneOf('up', 'down', 'same', 'new'),
      ue_validated: boolean,
      crossed_pass_mark: boolean,
      // With `closed`: the furthest step reached.
      reached: oneOf('dial', 'edit', 'reveal'),
    },
    required: ['step'],
    refine: (props) => {
      if (props.step !== 'reveal_shown') {
        for (const name of SIMULATOR_REVEAL_PROPERTIES) delete props[name]
      }
      if (props.step !== 'closed') delete props.reached
      return props
    },
  },
  // The « Mes notes » launch announcement: the dashboard card (shown, its
  // button, its close button) and the nav item's « Nouveau » marker clicked.
  launch_card: {
    properties: {
      action: oneOf('shown', 'cta', 'dismissed', 'tab_marker'),
    },
    required: ['action'],
  },
}

function pickAllowed(source, validators) {
  const picked = {}

  for (const [name, validate] of Object.entries(validators)) {
    if (!Object.hasOwn(source, name)) continue
    const value = validate(source[name])
    if (value !== undefined) picked[name] = value
  }

  return picked
}

// Returns { event, properties } with only allowlisted data, or null.
export function sanitizeAnalyticsEvent(rawEvent, { hasSession = false } = {}) {
  if (!rawEvent || typeof rawEvent !== 'object' || typeof rawEvent.event !== 'string') {
    return null
  }

  if (!Object.hasOwn(ANALYTICS_EVENTS, rawEvent.event)) {
    return null
  }

  const definition = ANALYTICS_EVENTS[rawEvent.event]
  if (!hasSession && !definition.allowWithoutSession) {
    return null
  }

  const source = rawEvent.properties && typeof rawEvent.properties === 'object' && !Array.isArray(rawEvent.properties)
    ? rawEvent.properties
    : {}
  let properties = {
    ...pickAllowed(source, CONTEXT_PROPERTIES),
    ...pickAllowed(source, definition.properties),
  }

  if ((definition.required ?? []).some((name) => !Object.hasOwn(properties, name))) {
    return null
  }

  if (definition.refine) {
    properties = definition.refine(properties)
    if (!properties) return null
  }

  return { event: rawEvent.event, properties }
}

// Parses a request body (JSON object or the raw text sent by
// navigator.sendBeacon) into a list of sanitized events.
export function sanitizeAnalyticsBatch(body, options = {}) {
  let payload = body

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      return []
    }
  }

  const rawEvents = Array.isArray(payload?.events) ? payload.events : []

  return rawEvents
    .slice(0, ANALYTICS_MAX_EVENTS_PER_BATCH)
    .map((rawEvent) => sanitizeAnalyticsEvent(rawEvent, options))
    .filter(Boolean)
}
