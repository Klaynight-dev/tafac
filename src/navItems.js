import universityConfig from '@university'
import { track } from './analytics'
import { navigateTo } from './appRoute'
import { ENT_AUTH_PREFIX } from './entApi'
import {
  GRADES_FEATURE_DISABLED,
  GRADES_FEATURE_ENABLED,
  GRADES_UNAVAILABLE_DETAIL,
  GRADES_UNAVAILABLE_TITLE,
} from './gradeFeatureState'

// Main navigation, shared by the desktop sidebar and the mobile tab bar.

const PLANNING_SERVICE_URL = universityConfig.planning?.serviceUrl ?? null
const PLANNING_HREF = PLANNING_SERVICE_URL
  ? `${ENT_AUTH_PREFIX}/launch?url=${encodeURIComponent(PLANNING_SERVICE_URL)}`
  : null

const MOODLE_ORIGIN = universityConfig.origins?.moodle ?? null
const MOODLE_HREF = universityConfig.features?.moodle && MOODLE_ORIGIN
  ? `${ENT_AUTH_PREFIX}/launch?url=${encodeURIComponent(`${MOODLE_ORIGIN.replace(/\/$/, '')}/my/`)}`
  : null
// Same link as the "Mails récents" card: the server opens the webmail
// already signed in (or falls back to its launch URL).
const MAIL_HREF = universityConfig.features?.mail ? `${ENT_AUTH_PREFIX}/mail/open` : null

// "Mes notes" follows the tri-state grades feature: the in-app grades page
// when live, a greyed-out item with the unavailability notice when
// 'disabled', nothing otherwise.
function buildGradesNavItem() {
  const base = { id: 'grades', label: 'Mes notes', icon: 'carbon:chart-pie' }

  if (GRADES_FEATURE_ENABLED) {
    return { ...base, route: 'grades' }
  }

  if (GRADES_FEATURE_DISABLED) {
    return {
      ...base,
      disabled: true,
      disabledTitle: GRADES_UNAVAILABLE_TITLE,
      disabledDetail: GRADES_UNAVAILABLE_DETAIL,
    }
  }

  return null
}

// Grades only for establishments whose config enables grade widgets.
function hasGradeWidgets(establishment) {
  return Boolean(universityConfig.establishments?.byId?.[establishment]?.gradeWidgets)
}

// Whether /notes can show the grades page (otherwise it falls back to the
// dashboard).
export function isGradesPageAvailable(establishment) {
  return GRADES_FEATURE_ENABLED && hasGradeWidgets(establishment)
}

export function buildNavItems(establishment) {
  const gradesNavItem = hasGradeWidgets(establishment) ? buildGradesNavItem() : null

  return [
    {
      id: 'applications',
      label: 'Toutes les applications',
      icon: 'carbon:app-switcher',
      // The dashboard home, where the applications grid lives.
      route: 'dashboard',
    },
    ...(gradesNavItem ? [gradesNavItem] : []),
    ...(universityConfig.features?.planning && PLANNING_HREF
      ? [{
          id: 'planning',
          label: 'Planning',
          icon: 'carbon:calendar',
          href: PLANNING_HREF,
          target: '_blank',
        }]
      : []),
    // shortLabel: the tab bar's narrower tabs.
    ...(MAIL_HREF
      ? [{ id: 'mail', label: 'Messagerie', shortLabel: 'Mail', icon: 'carbon:email', href: MAIL_HREF, target: '_blank' }]
      : []),
    ...(MOODLE_HREF
      ? [{ id: 'moodle', label: 'Moodle', icon: 'devicon-plain:moodle', href: MOODLE_HREF, target: '_blank' }]
      : []),
  ]
}

// Opens an item (in-app page, planning, mail…) and records which app it was
// and where it was opened from.
export function openNavItemLink(item, source) {
  if (item.route === 'dashboard') {
    navigateTo('dashboard')
    return
  }

  track('app_opened', { app: item.id, source })
  if (item.route) {
    navigateTo(item.route)
    return
  }

  if (item.target === '_blank') {
    window.open(item.href, '_blank', 'noopener,noreferrer')
    return
  }

  window.location.assign(item.href)
}

// The shortcuts the mobile tab bar carries (every nav item but "Toutes les
// applications", which is the dashboard itself). Empty means no tab bar.
export function getMobileTabItems(establishment) {
  return buildNavItems(establishment).filter((item) => item.id !== 'applications')
}
