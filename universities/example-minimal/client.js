// Client-safe config for the minimal example university (bundled into the
// browser build via the @university alias).
import logo from './assets/logo.svg'
import {
  id,
  branding,
  casOrigin,
  entOrigin,
  features,
  gradesCopy,
  planningServiceUrl,
  portalEntryPath,
  university,
} from './shared.js'

export default {
  id,

  university,

  branding: {
    ...branding,
    logo,
  },

  // No help links configured: the login page hides them.
  links: {},

  origins: {
    ent: entOrigin,
    cas: casOrigin,
  },

  auth: {
    portalEntryPath,
  },

  features,

  planning: {
    serviceUrl: planningServiceUrl,
  },

  // No establishments block: everyone gets the same (minimal) dashboard.

  services: {
    // No hand-made icons: tiles get the server's automatic icons
    // (server/appIcons.js, docs/ADDING_A_UNIVERSITY.md).
    getAppIcon: () => null,
    categories: [],
  },

  grades: gradesCopy,
}
