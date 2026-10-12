// Server-side config for the minimal example university.
import { id, casOrigin, entOrigin, features, gradesCopy, portalEntryPath } from './shared.js'

export default {
  id,
  features,

  origins: {
    ent: entOrigin,
    cas: casOrigin,
    // Services this university does not have (their features are off too).
    ade: null,
    moodle: null,
    planning: null,
  },

  auth: {
    portalEntryPath,
  },

  grades: gradesCopy,

  // Look of the automatic application tiles (server/appIcons.js). Optional:
  // these are the defaults.
  //   style: 'carbon' | 'phosphor' | 'phosphor-fill' | 'phosphor-duotone' | 'tabler'
  //   colorMode: 'pastel' | 'soft' | 'vivid' | 'mono'
  //   icons: { mail: 'mdi:email-outline' }   // replaces single concepts
  appIcons: {
    style: 'carbon',
    colorMode: 'pastel',
  },
}
