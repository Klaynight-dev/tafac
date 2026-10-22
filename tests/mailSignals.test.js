import assert from 'node:assert/strict'
import test from 'node:test'
import { concernsEstablishment, dashboardSignals, detectMailSignals, extractDays, noticeForEvent } from '../src/mailSignals.js'

// Wednesday 21 October 2026, at noon.
const RECEIVED = '2026-10-21T12:00:00'
const mail = (subject, snippet = '', id = subject) => ({ id, subject, snippet, receivedAt: RECEIVED })

test('a blocked IUT is a closure for the IUT, dated by its weekday', () => {
  const [signal] = detectMailSignals([mail('IUT bloqué jeudi', 'Les cours en présentiel ne pourront pas avoir lieu.')])
  assert.equal(signal.kind, 'closure')
  assert.deepEqual(signal.sites, ['iut'])
  assert.deepEqual(signal.days, ['2026-10-22'])
  assert.equal(concernsEstablishment(signal, 'iutlan'), true)
  assert.equal(concernsEstablishment(signal, 'enssat'), false)
})

test('the ENSSAT closed tomorrow concerns its students only', () => {
  const [signal] = detectMailSignals([mail('Fermeture de l’ENSSAT demain', 'Les bâtiments seront fermés.')])
  assert.equal(signal.kind, 'closure')
  assert.deepEqual(signal.days, ['2026-10-22'])
  assert.equal(concernsEstablishment(signal, 'enssat'), true)
  assert.equal(concernsEstablishment(signal, 'iutlan'), false)
})

test('reads explicit dates, ranges and numeric dates', () => {
  assert.deepEqual(extractDays('greve du 23 au 25 octobre', '2026-10-21'), ['2026-10-23', '2026-10-24', '2026-10-25'])
  assert.deepEqual(extractDays('examen le 3/11', '2026-10-21'), ['2026-11-03'])
  // A December mail about January: next year.
  assert.deepEqual(extractDays('reprise le 5 janvier', '2026-12-18'), ['2027-01-05'])
  assert.deepEqual(extractDays("cours annule aujourd'hui", '2026-10-21'), ['2026-10-21'])
})

test('ordinary mails raise nothing', () => {
  assert.deepEqual(detectMailSignals([
    mail('Inscriptions au tournoi de foot', 'Les inscriptions sont ouvertes jusqu’à vendredi.'),
    mail('Rapport de stage', 'Pensez à déposer votre rapport sur Moodle.'),
  ]), [])
})

test('a cancelled class marks that class on its day, not the others', () => {
  const signals = detectMailSignals([mail('Cours de Réseaux annulé', 'Le TD Réseaux de jeudi 22 octobre n’aura pas lieu.')])
  const day = '2026-10-22'
  assert.equal(noticeForEvent(signals, { title: 'TD Réseaux', teacher: 'DUPONT Jean', day }, 'iutlan')?.kind, 'cancelled')
  assert.equal(noticeForEvent(signals, { title: 'Anglais', teacher: 'SMITH Anna', day }, 'iutlan'), null)
  assert.equal(noticeForEvent(signals, { title: 'TD Réseaux', teacher: 'DUPONT Jean', day: '2026-10-29' }, 'iutlan'), null)
})

test('a room change names the new room, found by the teacher', () => {
  const signals = detectMailSignals([mail('Changement de salle', 'Le cours de M. Dupont du 22/10 aura lieu en salle B204.')])
  const notice = noticeForEvent(signals, { title: 'R5.C.11 Optimisation', teacher: 'DUPONT Jean', day: '2026-10-22' }, 'iutlan')
  assert.equal(notice.kind, 'room')
  assert.equal(notice.label, 'Salle changée : B204 (mail)')
})

test('a strike marks every class of the day; the dashboard keeps what is ahead', () => {
  const signals = detectMailSignals([
    mail('Préavis de grève', 'Mouvement social le jeudi 22 octobre.', 'strike'),
    mail('Cours annulé', 'Le CM d’Anglais du 2 octobre est annulé.', 'past'),
  ])
  assert.equal(noticeForEvent(signals, { title: 'Anglais', teacher: '', day: '2026-10-22' }, 'enssat')?.kind, 'strike')
  assert.deepEqual(dashboardSignals(signals, 'iutlan', '2026-10-21').map(({ id }) => id), ['strike'])
})
