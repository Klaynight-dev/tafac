import { useSyncExternalStore } from 'react'
import universityConfig from '@university'
import { CHANGELOG } from './changelog'
import {
  getApplicableEntries,
  markAllSeen,
  readSeenValue,
  resolveChangelogVisit,
  writeSeenValue,
} from './changelogState'

// « Nouveautés » state shared by the dashboard pill, the list and the
// Réglages row: opening the list from anywhere hides the pill. Resolved once
// per page load, on first use (a first visit is recorded as seen right then).
//
// entries: what this university gets, newest first
// unseenIds: ids the pill is about, emptied when the list opens
// open: whether the list is showing
// highlightIds: the ids that were unseen when the list opened, marked in it
//   until it closes

const ENTRIES = getApplicableEntries(CHANGELOG, universityConfig)

let state = null
const listeners = new Set()

function getState() {
  if (!state) {
    const visit = resolveChangelogVisit({ entries: ENTRIES, allEntries: CHANGELOG, rawSeen: readSeenValue() })
    if (visit.nextSeen) {
      writeSeenValue(visit.nextSeen)
    }
    state = { entries: ENTRIES, unseenIds: visit.unseenIds, open: false, highlightIds: [] }
  }
  return state
}

function setState(patch) {
  state = { ...getState(), ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useChangelog() {
  return useSyncExternalStore(subscribe, getState)
}

// Opens the list and marks everything in it as seen.
export function openChangelog() {
  const { unseenIds } = getState()
  writeSeenValue(markAllSeen({ entries: ENTRIES, allEntries: CHANGELOG, rawSeen: readSeenValue() }))
  setState({ open: true, highlightIds: unseenIds, unseenIds: [] })
}

// Read once: reopening the list later shows nothing as new.
export function closeChangelog() {
  setState({ open: false, highlightIds: [] })
}
