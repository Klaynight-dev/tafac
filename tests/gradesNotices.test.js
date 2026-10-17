import assert from 'node:assert/strict'
import test from 'node:test'
import { describeJuryDecision, formatJuryDate, hashNoticeText } from '../src/gradesNotices.js'

function releveWith(semestre) {
  return { semestre }
}

test('no jury decision before the jury', () => {
  assert.equal(describeJuryDecision(null), null)
  assert.equal(describeJuryDecision(releveWith({})), null)
  assert.equal(describeJuryDecision(releveWith({ decision: { code: '' }, decision_annee: { code: '  ' } })), null)
})

test('a BUT year decision wins over the semester’s, with its date', () => {
  const decision = describeJuryDecision(releveWith({
    decision: { code: '', etat: 'I', date: '' },
    decision_annee: { code: 'ADM', date: '2026-07-02T12:00:00+02:00' },
  }))

  assert.equal(decision.code, 'ADM')
  assert.equal(decision.label, 'Admis')
  assert.equal(decision.tone, 'positive')
  assert.equal(decision.scope, 'year')
  assert.equal(formatJuryDate(decision.date), '2 juillet 2026')

  const both = describeJuryDecision(releveWith({ decision: { code: 'AJ' }, decision_annee: { code: 'PASD' } }))
  assert.equal(both.code, 'PASD')
  assert.equal(both.label, 'Passage de droit')
})

test('without a year decision, the semester’s is shown', () => {
  const decision = describeJuryDecision(releveWith({ decision: { code: 'aj', date: '2026-01-30' } }))

  assert.equal(decision.code, 'AJ')
  assert.equal(decision.label, 'Ajourné')
  assert.equal(decision.tone, 'neutral')
  assert.equal(decision.scope, 'semester')
  assert.equal(formatJuryDate(decision.date), '30 janvier 2026')
})

test('known codes get a label and a calm tone, unknown ones stay raw', () => {
  const read = (code) => describeJuryDecision(releveWith({ decision_annee: { code } }))

  assert.deepEqual(['ADM', 'ADJ', 'CMP', 'PASD'].map((code) => read(code).tone), ['positive', 'positive', 'positive', 'positive'])
  assert.equal(read('CMP').label, 'Validé par compensation')
  assert.equal(read('RAT').tone, 'pending')
  assert.equal(read('NAR').label, 'Non admis, réorientation')
  assert.equal(read('DEM').label, 'Démission')

  const unknown = read('ADSUP')
  assert.equal(unknown.code, 'ADSUP')
  assert.equal(unknown.label, null)
  assert.equal(unknown.tone, 'neutral')
})

test('a date ScoDoc didn’t send as ISO is left out', () => {
  assert.equal(describeJuryDecision(releveWith({ decision_annee: { code: 'ADM', date: '02/07/2026' } })).date, null)
  assert.equal(describeJuryDecision(releveWith({ decision_annee: { code: 'ADM' } })).date, null)
  assert.equal(formatJuryDate(null), null)
})

test('a message’s fingerprint is short, stable and changes with the text', () => {
  const hash = hashNoticeText('Les jurys auront lieu le 2 juillet.')

  assert.match(hash, /^[0-9a-z]{1,7}$/)
  assert.equal(hashNoticeText('Les jurys auront lieu le 2 juillet.'), hash)
  assert.notEqual(hashNoticeText('Les jurys auront lieu le 3 juillet.'), hash)
  assert.equal(hashNoticeText(''), hashNoticeText(null))
})
