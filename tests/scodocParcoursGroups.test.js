import assert from 'node:assert/strict'
import test from 'node:test'
import { buildParcoursTpAliases } from '../src/scodocParcoursGroups.js'

// ADE TP leaves under the "A1 J" TD node of BUT INFO-COM Lannion (parcours Journalisme).
const infoComTpLabels = ['1A2 J', '1A1 J']

test('maps parcours-named ScoDoc groups to the ADE TP leaf', () => {
  for (const scodocLabel of ['JOUR 1-2', 'JOUR1A2', 'groupeJOUR1A2']) {
    const aliases = buildParcoursTpAliases(scodocLabel)
    assert.deepEqual(aliases, ['1A2 J', '1A2'], scodocLabel)
    assert.equal(infoComTpLabels.find((label) => aliases.includes(label)), '1A2 J', scodocLabel)
  }

  assert.deepEqual(buildParcoursTpAliases('COM 2-1'), ['2A1 C', '2A1'])
})

test('leaves the other group conventions to the existing aliases', () => {
  for (const scodocLabel of ['JOU', '2B2', '1A2', 'TD B TP 2', 'TP 04B', 'TP 1-2', 'Groupe 1-2', '']) {
    assert.deepEqual(buildParcoursTpAliases(scodocLabel), [], scodocLabel)
  }
})
