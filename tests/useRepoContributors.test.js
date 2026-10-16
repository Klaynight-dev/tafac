import assert from 'node:assert/strict'
import test from 'node:test'
import { readContributors, readRepoSlug } from '../src/useRepoContributors.js'

test('readRepoSlug reads a GitHub repo URL', () => {
  assert.equal(readRepoSlug('https://github.com/l-ent-univ/tafac'), 'l-ent-univ/tafac')
  assert.equal(readRepoSlug('https://github.com/l-ent-univ/tafac.git'), 'l-ent-univ/tafac')
  assert.equal(readRepoSlug('https://github.com/l-ent-univ/tafac/'), 'l-ent-univ/tafac')
  assert.equal(readRepoSlug('https://gitlab.com/a/b'), null)
  assert.equal(readRepoSlug(undefined), null)
})

test('readContributors keeps people, minus the team', () => {
  const payload = [
    { login: 'tom-things', type: 'User', contributions: 300 },
    { login: 'Klaynight-dev', type: 'User', contributions: 40 },
    { login: 'dependabot[bot]', type: 'Bot', contributions: 9 },
    { login: 'Tryon-Dev', type: 'User', contributions: 12 },
  ]
  assert.deepEqual(readContributors(payload, ['tom-things', 'tryon-dev']), [{ login: 'Klaynight-dev', contributions: 40 }])
  assert.deepEqual(readContributors({ message: 'rate limited' }), [])
})
