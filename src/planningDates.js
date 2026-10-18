// Days of the planning page as local "YYYY-MM-DD" keys, and the French texts
// it shows (as the iOS app words them, ScheduleEvent). Pure, see
// tests/planningDates.test.js.

const DAY_MS = 24 * 60 * 60 * 1000

export function toDayKey(date) {
  const value = date instanceof Date ? date : new Date(date)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

// Local midnight of a key.
export function parseDayKey(key) {
  const [year, month, day] = String(key).split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(key, count) {
  const date = parseDayKey(key)
  date.setDate(date.getDate() + count)
  return toDayKey(date)
}

// Whole days from `from` to `to` (rounded: a DST night is 23 or 25 hours).
export function daysBetween(from, to) {
  return Math.round((parseDayKey(to) - parseDayKey(from)) / DAY_MS)
}

// 0 on Monday … 6 on Sunday.
export function weekdayIndex(key) {
  return (parseDayKey(key).getDay() + 6) % 7
}

export function startOfWeek(key) {
  return addDays(key, -weekdayIndex(key))
}

// The same weekday in the week of `monday`.
export function sameWeekday(key, monday) {
  return addDays(monday, weekdayIndex(key))
}

function capitalize(text) {
  return text ? text.charAt(0).toLocaleUpperCase('fr-FR') + text.slice(1) : text
}

const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const FULL_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const SHORT_WEEKDAY_FORMAT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })
const TIME_FORMAT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

// "Octobre": the month alone, no year (the month capsule).
export function monthLabel(key) {
  return capitalize(MONTH_FORMAT.format(parseDayKey(key)))
}

// The week strip's letters, Monday first.
export const WEEKDAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

// "Lun.": a week column's header.
export function shortWeekdayText(key) {
  return capitalize(SHORT_WEEKDAY_FORMAT.format(parseDayKey(key)))
}

// The week of `monday`, Monday to Sunday: "12 – 18 octobre 2026",
// "28 septembre – 4 octobre 2026", "28 décembre 2026 – 3 janvier 2027".
export function weekRangeText(monday) {
  const first = parseDayKey(monday)
  const last = parseDayKey(addDays(monday, 6))
  const year = last.getFullYear()
  if (first.getFullYear() !== year) return `${DAY_MONTH_FORMAT.format(first)} ${first.getFullYear()} – ${DAY_MONTH_FORMAT.format(last)} ${year}`
  if (first.getMonth() !== last.getMonth()) return `${DAY_MONTH_FORMAT.format(first)} – ${DAY_MONTH_FORMAT.format(last)} ${year}`
  return `${first.getDate()} – ${DAY_MONTH_FORMAT.format(last)} ${year}`
}

// "08:55".
export function formatTime(ms) {
  return TIME_FORMAT.format(ms)
}

// "45 min" under an hour, "1h30", "2h00" otherwise.
export function durationText(startMs, endMs) {
  const minutes = Math.max(0, Math.round((endMs - startMs) / 60000))
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

// "Mercredi 23 septembre".
export function dayText(key) {
  return capitalize(DAY_FORMAT.format(parseDayKey(key)))
}

// "samedi 18 octobre 2026": what a page is read out as.
export function fullDayText(key) {
  return FULL_FORMAT.format(parseDayKey(key))
}

// "Aujourd’hui", "Demain", the weekday within the week ahead, the day after.
export function relativeDayText(key, todayKey) {
  const distance = daysBetween(todayKey, key)
  if (distance === 0) return 'Aujourd’hui'
  if (distance === 1) return 'Demain'
  if (distance > 1 && distance < 7) return capitalize(WEEKDAY_FORMAT.format(parseDayKey(key)))
  return dayText(key)
}

// The week of `monday` in short, without the year (a phone's chip in the
// list): "12 – 18 oct.", "28 sept. – 4 oct.", "28 déc. – 3 janv.".
const SHORT_MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'short' })
export function shortWeekRangeText(monday) {
  const first = parseDayKey(monday)
  const last = parseDayKey(addDays(monday, 6))
  const lastText = `${last.getDate()} ${SHORT_MONTH_FORMAT.format(last)}`
  if (first.getMonth() === last.getMonth()) return `${first.getDate()} – ${lastText}`
  return `${first.getDate()} ${SHORT_MONTH_FORMAT.format(first)} – ${lastText}`
}

// A day's heading in the list: "Aujourd’hui", "Demain" or "Hier" with its
// date as the detail ("dimanche 18 octobre"), any other day by its date
// ("Mardi 20 octobre") and no detail.
const RELATIVE_DAYS = { '-1': 'Hier', 0: 'Aujourd’hui', 1: 'Demain' }
export function agendaDayText(key, todayKey) {
  const title = RELATIVE_DAYS[daysBetween(todayKey, key)]
  return title ? { title, detail: DAY_FORMAT.format(parseDayKey(key)) } : { title: dayText(key), detail: null }
}
