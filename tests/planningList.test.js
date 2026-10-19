import assert from 'node:assert/strict'
import test from 'node:test'
import { agendaDayText, shortWeekRangeText } from '../src/planningDates.js'
import { isOngoing, listWeekDays, toPlanningEvent } from '../src/planningEvents.js'

const at = (month, day, hour, minute = 0) => new Date(2026, month - 1, day, hour, minute).getTime()
const lesson = (title, month, day, from, to) => toPlanningEvent({ id: title, title, startMs: at(month, day, from), endMs: at(month, day, to) })

test('the list shows a week’s days with classes, and today and the picked day', () => {
  // Week of Monday 12 October 2026: classes on Monday (two) and Wednesday.
  const events = [
    lesson('Anglais', 10, 12, 8, 10),
    lesson('UX', 10, 12, 13, 15),
    lesson('Dev', 10, 14, 10, 12),
    lesson('Autre semaine', 10, 19, 8, 10),
  ]
  const days = listWeekDays(events, '2026-10-12', { todayKey: '2026-10-18', selectedDay: '2026-10-16' })
  assert.deepEqual(days.map((entry) => entry.day), ['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-18'])
  assert.deepEqual(days[0].events.map((event) => event.title), ['Anglais', 'UX'])
  assert.deepEqual(days[2].events, [])
  // Without a today or a picked day in the week: the days with classes only.
  assert.deepEqual(listWeekDays(events, '2026-10-12').map((entry) => entry.day), ['2026-10-12', '2026-10-14'])
  // A week without any class: no day at all (one note instead).
  assert.deepEqual(listWeekDays(events, '2026-10-26', { todayKey: '2026-10-26', selectedDay: '2026-10-27' }), [])
})

test('a class is on from its start to just before its end', () => {
  const event = lesson('Anglais', 10, 12, 8, 10)
  assert.equal(isOngoing(event, at(10, 12, 7, 59)), false)
  assert.equal(isOngoing(event, at(10, 12, 8)), true)
  assert.equal(isOngoing(event, at(10, 12, 9, 59)), true)
  assert.equal(isOngoing(event, at(10, 12, 10)), false)
})

test('the list’s day headings and the phone’s short week range', () => {
  assert.deepEqual(agendaDayText('2026-10-18', '2026-10-18'), { title: 'Aujourd’hui', detail: 'dimanche 18 octobre' })
  assert.deepEqual(agendaDayText('2026-10-19', '2026-10-18'), { title: 'Demain', detail: 'lundi 19 octobre' })
  assert.deepEqual(agendaDayText('2026-10-17', '2026-10-18'), { title: 'Hier', detail: 'samedi 17 octobre' })
  assert.deepEqual(agendaDayText('2026-10-20', '2026-10-18'), { title: 'Mardi 20 octobre', detail: null })
  assert.equal(shortWeekRangeText('2026-10-12'), '12 – 18 oct.')
  assert.equal(shortWeekRangeText('2026-09-28'), '28 sept. – 4 oct.')
  assert.equal(shortWeekRangeText('2026-12-28'), '28 déc. – 3 janv.')
})
