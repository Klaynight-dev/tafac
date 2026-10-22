import assert from 'node:assert/strict'
import test from 'node:test'
import { buildIcsCalendar, escapeIcsText, eventUid, foldIcsLine, formatIcsDate, utf8ByteLength } from '../src/planningIcs.js'
import { toPlanningEvent } from '../src/planningEvents.js'

const NOW = Date.UTC(2026, 9, 18, 9, 30, 15)
const lesson = (overrides = {}) => toPlanningEvent({
  uid: 'ADE-123',
  title: 'R315 Traitement du signal',
  start: '2026-10-19T08:00:00+02:00',
  end: '2026-10-19T10:00:00+02:00',
  location: 'B204',
  teacher: 'Dupont Marie',
  groupsLabel: 'TP A1',
  ...overrides,
})
const unfold = (text) => text.replace(/\r\n /g, '')
const lines = (text) => text.split('\r\n')

test('TEXT values escape backslashes, separators and every newline', () => {
  assert.equal(escapeIcsText('a\\b; c, d'), 'a\\\\b\\; c\\, d')
  assert.equal(escapeIcsText('un\r\ndeux\rtrois\nquatre'), 'un\\ndeux\\ntrois\\nquatre')
  assert.equal(escapeIcsText(null), '')
})

test('UTF-8 lengths count octets, not UTF-16 units', () => {
  assert.equal(utf8ByteLength('abc'), 3)
  assert.equal(utf8ByteLength('é'), 2)
  assert.equal(utf8ByteLength('É'), 2)
  assert.equal(utf8ByteLength('’'), 3)
  assert.equal(utf8ByteLength('📅'), 4)
})

test('long lines fold at 75 octets, never inside a character', () => {
  assert.equal(foldIcsLine('SUMMARY:court'), 'SUMMARY:court')
  const line = `SUMMARY:${'Électronique numérique et télécommunications avancées – '.repeat(4)}📅 Études`
  const folded = foldIcsLine(line)
  const parts = folded.split('\r\n')
  assert.ok(parts.length > 3)
  for (const [index, part] of parts.entries()) {
    assert.ok(utf8ByteLength(part) <= 75, `line ${index} is ${utf8ByteLength(part)} octets`)
    if (index > 0) assert.ok(part.startsWith(' '))
    // A split emoji would leave a lone surrogate (a pair is one code point here).
    assert.doesNotMatch(part, /[\uD800-\uDFFF]/u)
  }
  // Filled: each line but the last can't take its next character.
  for (let index = 0; index < parts.length - 1; index += 1) {
    const next = [...parts[index + 1].slice(1)][0]
    assert.ok(utf8ByteLength(parts[index]) + utf8ByteLength(next) > 75)
  }
  assert.equal(unfold(folded), line)
  assert.equal(new TextDecoder().decode(new TextEncoder().encode(unfold(folded))), line)
})

test('times are UTC DATE-TIMEs', () => {
  assert.equal(formatIcsDate(Date.parse('2026-10-19T08:00:00+02:00')), '20261019T060000Z')
  // Winter time: one hour off UTC.
  assert.equal(formatIcsDate(Date.parse('2026-11-02T08:00:00+01:00')), '20261102T070000Z')
})

test('a class keeps its UID from one export to the next', () => {
  const uid = eventUid(lesson())
  assert.match(uid, /^[0-9a-f]{16}@tafac$/)
  assert.equal(eventUid(lesson()), uid)
  assert.equal(eventUid(lesson({ location: 'C101' })), uid)
  // Moved (same ADE id, another time): the same UID, so a new import moves it.
  assert.equal(eventUid(lesson({ start: '2026-10-20T08:00:00+02:00', end: '2026-10-20T10:00:00+02:00' })), uid)
  assert.notEqual(eventUid(lesson({ uid: 'ADE-124' })), uid)
  // An ADE id shared in the file: back on the whole id, never two alike.
  assert.notEqual(eventUid(lesson(), { sharedUid: true }), uid)
  const first = buildIcsCalendar([lesson()], { now: NOW })
  const second = buildIcsCalendar([lesson()], { now: NOW + 3600 * 1000 })
  const uidsOf = (text) => lines(text).filter((line) => line.startsWith('UID:'))
  assert.deepEqual(uidsOf(first), uidsOf(second))
})

test('the calendar is RFC 5545: CRLF lines, its header, one VEVENT a class', () => {
  const events = [
    lesson(),
    lesson({ uid: 'ADE-200', title: 'Anglais; oral, groupe \\ B', start: '2026-10-20T14:00:00+02:00', end: '2026-10-20T15:30:00+02:00', location: null, teacher: null, groupsLabel: null }),
  ]
  const text = buildIcsCalendar(events, { name: 'Planning Tafac', now: NOW })
  assert.ok(text.endsWith('\r\n'))
  assert.doesNotMatch(text.replace(/\r\n/g, ''), /[\r\n]/)
  const all = lines(unfold(text)).slice(0, -1)
  assert.deepEqual(all.slice(0, 7), [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tafac//Planning//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Planning Tafac',
    'X-WR-TIMEZONE:Europe/Paris',
  ])
  assert.equal(all.at(-1), 'END:VCALENDAR')
  assert.equal(all.filter((line) => line === 'BEGIN:VEVENT').length, 2)
  assert.equal(all.filter((line) => line === 'END:VEVENT').length, 2)
  const first = all.slice(all.indexOf('BEGIN:VEVENT'), all.indexOf('END:VEVENT') + 1)
  assert.deepEqual(first, [
    'BEGIN:VEVENT',
    `UID:${eventUid(events[0])}`,
    'DTSTAMP:20261018T093015Z',
    'SEQUENCE:29871930',
    'DTSTART:20261019T060000Z',
    'DTEND:20261019T080000Z',
    'SUMMARY:R315 Traitement du signal',
    'LOCATION:B204',
    'DESCRIPTION:Dupont Marie\\nTP A1',
    'END:VEVENT',
  ])
  // No room, teacher or group: no LOCATION nor DESCRIPTION.
  assert.ok(all.includes('SUMMARY:Anglais\\; oral\\, groupe \\\\ B'))
  assert.equal(all.filter((line) => line.startsWith('LOCATION:')).length, 1)
  assert.equal(all.filter((line) => line.startsWith('DESCRIPTION:')).length, 1)
})

test('accented titles fold within 75 octets in the file', () => {
  const title = 'Énergétique, thermodynamique et mécanique des fluides appliquées à l’ingénierie électrique'
  const text = buildIcsCalendar([lesson({ title })], { now: NOW })
  for (const line of lines(text)) assert.ok(utf8ByteLength(line) <= 75)
  assert.ok(lines(unfold(text)).includes(`SUMMARY:${escapeIcsText(title)}`))
})

test('an empty planning is still a calendar', () => {
  assert.equal(
    buildIcsCalendar([], { name: 'Planning Tafac', now: NOW }),
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Tafac//Planning//FR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Planning Tafac\r\nX-WR-TIMEZONE:Europe/Paris\r\nEND:VCALENDAR\r\n',
  )
})

test('a later export is a newer version of the same classes', () => {
  const sequenceOf = (text) => lines(text).find((line) => line.startsWith('SEQUENCE:'))
  const first = buildIcsCalendar([lesson()], { now: NOW })
  const later = buildIcsCalendar([lesson({ start: '2026-10-20T08:00:00+02:00', end: '2026-10-20T10:00:00+02:00' })], { now: NOW + 3600000 })
  assert.equal(sequenceOf(first), `SEQUENCE:${Math.floor(NOW / 60000)}`)
  assert.ok(Number(sequenceOf(later).slice(9)) > Number(sequenceOf(first).slice(9)))
  // Two classes with the same ADE id in one file keep distinct UIDs.
  const twins = buildIcsCalendar([lesson(), lesson({ start: '2026-10-21T08:00:00+02:00', end: '2026-10-21T10:00:00+02:00' })], { now: NOW })
  const uids = lines(twins).filter((line) => line.startsWith('UID:'))
  assert.equal(new Set(uids).size, 2)
})
