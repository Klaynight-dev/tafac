import assert from 'node:assert/strict'
import test from 'node:test'
import { pickAdeGroupForAlias } from '../src/adeGroupMatch.js'

const STUDENTS = 'Ressources.Etudiants.IUT Lannion'
const results = [
  { id: '1', name: '3B3 MMI', path: `${STUDENTS}.BUT MMI.MMI A3.3B MMI.3B3 MMI` },
  { id: '2', name: '3B3 INFO', path: `${STUDENTS}.BUT INFO.INFO A3.3B INFO.3B3 INFO` },
  { id: '3', name: '3B3', path: 'Ressources.Salles.IUT Lannion.3B3' },
  { id: '4', name: '1A2 J', path: `${STUDENTS}.BUT INFO-COM.A1 J.1A2 J` },
  { id: '5', name: '2B2-Dev MMI', path: `${STUDENTS}.BUT MMI.MMI A2.2B MMI.2B2-Dev MMI` },
  { id: '6', name: '2B2-StratUX MMI', path: `${STUDENTS}.BUT MMI.MMI A2.2B MMI.2B2-StratUX MMI` },
]

test('finds the student group named after the ScoDoc group', () => {
  assert.equal(pickAdeGroupForAlias(results.slice(0, 1), '3B3')?.id, '1')
  assert.equal(pickAdeGroupForAlias(results, '1A2 J')?.id, '4')
  assert.equal(pickAdeGroupForAlias(results, '1A2')?.id, '4')
})

test('leaves out rooms and teachers', () => {
  assert.equal(pickAdeGroupForAlias([results[2]], '3B3'), null)
})

test('narrows several programmes down to the student’s', () => {
  assert.equal(pickAdeGroupForAlias(results, '3B3'), null)
  assert.equal(pickAdeGroupForAlias(results, '3B3', ['BUT MMI', 'MMI'])?.id, '1')
})

test('gives up when it stays ambiguous', () => {
  assert.equal(pickAdeGroupForAlias(results, '2B2', ['BUT MMI']), null)
  assert.equal(pickAdeGroupForAlias(results, ''), null)
  assert.equal(pickAdeGroupForAlias(null, '3B3'), null)
})
