import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSearchText, scoreAppSearch, searchApps } from '../src/appSearch.js'

const APPS = [
  { title: 'Notes IUT Lannion', description: 'Consulter ses notes et résultats' },
  { title: 'Messagerie' },
  { title: 'Emplois du temps' },
  { title: 'Moodle' },
  { title: 'Annuaire' },
  { title: 'Documentation services' },
  { title: 'Assistance' },
  { title: 'Webconference' },
  { title: 'Microsoft 365' },
  { title: 'Loxya', description: 'Location de matériel audiovisuel' },
  { title: 'Élève absences', category: 'Scolarité' },
]

const titles = (query) => searchApps(APPS, query).map((app) => app.title)

test('accents, case and punctuation are ignored', () => {
  assert.equal(normalizeSearchText('  Élève — Prêt!  '), 'eleve pret')
  assert.deepEqual(titles('eleve'), ['Élève absences'])
  assert.deepEqual(titles('EMPLOI'), ['Emplois du temps'])
})

test('words match from their start, in any order', () => {
  assert.deepEqual(titles('temps'), ['Emplois du temps'])
  assert.deepEqual(titles('temps emp'), ['Emplois du temps'])
  assert.deepEqual(titles('lannion notes'), ['Notes IUT Lannion'])
})

test('synonyms students type find the right app', () => {
  assert.deepEqual(titles('mail'), ['Messagerie'])
  assert.deepEqual(titles('cours'), ['Moodle'])
  assert.deepEqual(titles('visio'), ['Webconference'])
  assert.deepEqual(titles('edt'), ['Emplois du temps'])
  assert.deepEqual(titles('word'), ['Microsoft 365'])
  assert.deepEqual(titles('aide'), ['Assistance'])
})

test('descriptions and categories count, below the title', () => {
  assert.deepEqual(titles('audiovisuel'), ['Loxya'])
  assert.deepEqual(titles('scolarite'), ['Élève absences'])
  // "notes": the title match comes first, the description match is the same app.
  assert.deepEqual(titles('resultats'), ['Notes IUT Lannion'])
})

test('title matches rank first, then the list order', () => {
  const apps = [{ title: 'Partage de fichiers' }, { title: 'Messagerie' }, { title: 'Mail étudiant' }]
  assert.deepEqual(searchApps(apps, 'mail').map((app) => app.title), ['Mail étudiant', 'Messagerie'])
  assert.ok(scoreAppSearch({ title: 'Moodle' }, 'moo') > scoreAppSearch({ title: 'Moodle' }, 'cours'))
})

test('a plain piece of the title still matches, an empty query keeps everything', () => {
  assert.deepEqual(titles('soft'), ['Microsoft 365'])
  assert.equal(searchApps(APPS, '   ').length, APPS.length)
  assert.deepEqual(titles('zzz'), [])
})
