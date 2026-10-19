// The planning as an iCalendar file (RFC 5545), for Google Agenda, Apple
// Calendrier or Outlook: one VEVENT a class, its times in UTC, its UID
// hashed from the class's id so importing the file again updates the
// classes instead of doubling them. Pure, see tests/planningIcs.test.js.

export const ICS_FILE_NAME = 'planning-tafac.ics'
export const ICS_MIME_TYPE = 'text/calendar;charset=utf-8'
const CALENDAR_NAME = 'Planning Tafac'
const CRLF = '\r\n'
// A content line's longest, in octets, its CRLF aside (RFC 5545 3.1).
const MAX_LINE_OCTETS = 75

// A TEXT value: backslashes, semicolons and commas escaped, every newline
// (CRLF, CR or LF) written "\n" (RFC 5545 3.3.11).
export function escapeIcsText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
}

// A character's UTF-8 length, from its code point.
function utf8Length(codePoint) {
  if (codePoint < 0x80) return 1
  if (codePoint < 0x800) return 2
  if (codePoint < 0x10000) return 3
  return 4
}

export function utf8ByteLength(text) {
  let length = 0
  for (const character of String(text)) length += utf8Length(character.codePointAt(0))
  return length
}

// A content line folded at 75 octets (RFC 5545 3.1): the next part on a
// line starting with a space (counted in its 75), never inside a
// character's UTF-8 bytes (nor a surrogate pair, iterated as one).
export function foldIcsLine(line) {
  const parts = []
  let current = ''
  let octets = 0
  for (const character of String(line)) {
    const length = utf8Length(character.codePointAt(0))
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1
    if (octets + length > limit) {
      parts.push(current)
      current = ''
      octets = 0
    }
    current += character
    octets += length
  }
  parts.push(current)
  return parts.join(`${CRLF} `)
}

// A UTC DATE-TIME, "20261019T065500Z".
export function formatIcsDate(ms) {
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z').replace(/[-:]/g, '')
}

// 64-bit FNV-1a over the id's UTF-8 bytes, in hex: the same id, the same
// token, on every export.
const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const MASK_64 = 0xffffffffffffffffn

function fnv1a64(text) {
  let hash = FNV_OFFSET
  for (const byte of new TextEncoder().encode(String(text))) {
    hash = ((hash ^ BigInt(byte)) * FNV_PRIME) & MASK_64
  }
  return hash.toString(16).padStart(16, '0')
}

// A class's UID, hashed to a safe token ("3f9c…@tafac"): from ADE's own id
// for it, which stays when the class is moved, so importing the file again
// moves it in the calendar instead of adding it twice. Without that id, or
// when it isn't unique in the file (`sharedUid`), from the class's whole
// id (ADE's id, start, end and title).
export function eventUid(event, { sharedUid = false } = {}) {
  return event.uid && !sharedUid ? `${fnv1a64(`ade:${event.uid}`)}@tafac` : `${fnv1a64(event.id)}@tafac`
}

// The DESCRIPTION's lines: the teacher, then the group.
function descriptionOf(event) {
  return [event.teacher, event.group].filter(Boolean).join('\n')
}

function eventLines(event, { stamp, sequence, sharedUid }) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${eventUid(event, { sharedUid })}`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${sequence}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(Math.max(event.end, event.start))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ]
  if (event.location) lines.push(`LOCATION:${escapeIcsText(event.location)}`)
  const description = descriptionOf(event)
  if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`)
  lines.push('END:VEVENT')
  return lines
}

// The whole file, CRLF line endings, from the page's classes
// (toPlanningEvent's): `name` titles the calendar in the app it lands in,
// `now` stamps it (DTSTAMP) and numbers this export (SEQUENCE, the minutes
// since 1970: a later export is a newer version of the same classes, which
// Apple Calendrier and Outlook take as an update when it's imported again).
export function buildIcsCalendar(events, { name = CALENDAR_NAME, now = Date.now() } = {}) {
  const stamp = formatIcsDate(now)
  const sequence = Math.floor(now / 60000)
  const classes = events.filter((event) => event && Number.isFinite(event.start))
  const uidCounts = new Map()
  for (const event of classes) if (event.uid) uidCounts.set(event.uid, (uidCounts.get(event.uid) ?? 0) + 1)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tafac//Planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(name)}`,
    'X-WR-TIMEZONE:Europe/Paris',
    ...classes.flatMap((event) => eventLines(event, { stamp, sequence, sharedUid: uidCounts.get(event.uid) > 1 })),
    'END:VCALENDAR',
  ]
  return lines.map(foldIcsLine).join(CRLF) + CRLF
}
