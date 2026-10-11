// Imported first by main.jsx: some modules read settings when they load
// (analytics reads the opt-out), so transferred ones must already be there.
import { importTransferredSettings } from './settingsTransfer'

importTransferredSettings()
