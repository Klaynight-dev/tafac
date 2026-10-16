// What the notices above the "Mes notes" cards say: the jury's decision on
// the relevé and the department's message (see GradesNotice.jsx).

// ScoDoc jury codes, in plain words. Only codes whose meaning is certain:
// any other one is shown as is rather than guessed at. Tones stay calm, a
// setback is never shown as an alarm.
const JURY_DECISIONS = {
  ADM: { label: 'Admis', tone: 'positive' },
  ADJ: { label: 'Admis par décision du jury', tone: 'positive' },
  CMP: { label: 'Validé par compensation', tone: 'positive' },
  PASD: { label: 'Passage de droit', tone: 'positive' },
  RAT: { label: 'En attente de rattrapage', tone: 'pending' },
  AJ: { label: 'Ajourné', tone: 'neutral' },
  DEF: { label: 'Défaillant', tone: 'neutral' },
  DEM: { label: 'Démission', tone: 'neutral' },
  NAR: { label: 'Non admis, réorientation', tone: 'neutral' },
}

function readCode(decision) {
  const code = decision?.code
  return typeof code === 'string' && code.trim() ? code.trim().toUpperCase() : null
}

// ScoDoc sends ISO dates here; anything else is left out rather than misread.
function readDecisionDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

// The jury's decision on a relevé, or null before the jury. For a BUT the
// year's decision is the one that matters (ScoDoc often leaves the
// semester's empty), so it wins when both are there.
export function describeJuryDecision(releve) {
  const semestre = releve?.semestre
  const yearCode = readCode(semestre?.decision_annee)
  const code = yearCode ?? readCode(semestre?.decision)
  if (!code) return null

  const known = JURY_DECISIONS[code] ?? null
  return {
    code,
    label: known?.label ?? null,
    tone: known?.tone ?? 'neutral',
    scope: yearCode ? 'year' : 'semester',
    date: readDecisionDate(yearCode ? semestre.decision_annee.date : semestre.decision.date),
  }
}

// "2 juillet 2026", in the timezone of the universities.
export function formatJuryDate(date) {
  return date
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' }).format(date)
    : null
}

// Short fingerprint of a message (FNV-1a), so a dismissed one can be
// recognised without storing its text.
export function hashNoticeText(text) {
  let hash = 0x811c9dc5
  for (const character of String(text ?? '')) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

// Per viewer and browser: the department message closed last, as its
// fingerprint. A new message shows again. A convenience: unreadable storage
// just shows the message.
const DISMISSED_MESSAGE_KEY = 'l-ent:grades-dept-message-dismissed'

export function readDismissedMessageHash() {
  try {
    return localStorage.getItem(DISMISSED_MESSAGE_KEY)
  } catch {
    return null
  }
}

export function writeDismissedMessageHash(hash) {
  try {
    localStorage.setItem(DISMISSED_MESSAGE_KEY, hash)
  } catch {
    // Storage unavailable: the message comes back next visit, nothing worse.
  }
}
