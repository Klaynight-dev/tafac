// The planning service's app in the app lists (« Emplois du temps »,
// « Planning »: the university's timetable) and whether a tile of it opens
// the in-app Planning page instead, as the grade service's app opens « Mes
// notes » (gradesPortalApp.js). Pure, see tests/planningPortalApp.test.js;
// AvailableApplications passes the config in.
//
// The app is recognised by its link (serviceAppLink.js): on the planning
// service's origin (planning.serviceUrl in the config), directly or through
// the launch relay or a CAS login, never by its title (« planning » and
// « emploi » are in other apps' names). `appKeys` adds apps known by their
// key (fname, else id) whatever their link: the demo's « Emplois du temps »,
// which links to a public calendar.
import { getServiceOrigin, isServiceApp } from './serviceAppLink.js'

// The origin of `serviceUrl` (planning.serviceUrl in the config), or null.
export function getPlanningOrigin(serviceUrl) {
  return getServiceOrigin(serviceUrl)
}

// `planningOrigin`: getPlanningOrigin's; `resolvedHref`, `base`,
// `launchPath`, `casOrigin`: as for the grades portal (isServiceApp).
export function isPlanningPortalApp(application, { planningOrigin, appKeys = [], ...options } = {}) {
  if (!application) return false
  const key = application.fname || application.id
  if (key && appKeys.includes(key)) return true
  return isServiceApp(application, { ...options, serviceOrigin: planningOrigin })
}

// The one rule for every tile (grid, search results, favourites, sidebar):
// open the Planning page when the student has it, the planning service
// otherwise. `hasPlanningPage`: the page is in the student's navigation
// (features.planning, see navItems.js).
export function opensPlanningPageInApp(application, { hasPlanningPage = false, ...options } = {}) {
  return Boolean(hasPlanningPage) && isPlanningPortalApp(application, options)
}
