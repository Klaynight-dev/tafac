import assert from 'node:assert/strict'
import test from 'node:test'
import { assignSubjectIcons } from '../src/subjectIcons.js'

test('subjects get an icon of their own, in the university’s icon set', () => {
  const iconOf = assignSubjectIcons(['Anglais', 'Gestion de projet', 'UX Writing', 'Culture numérique', 'Développement Front', 'Prototype interactif', 'Portfolio'], 'phosphor-duotone')

  assert.equal(iconOf('Anglais'), 'ph:translate-duotone')
  assert.equal(iconOf('UX Writing'), 'ph:hand-tap-duotone')
  assert.equal(iconOf('Développement Front'), 'ph:browser-duotone')
  assert.equal(iconOf('Portfolio'), 'ph:briefcase-duotone')
  // Accents and case don't matter.
  assert.equal(iconOf('developpement FRONT'), 'ph:browser-duotone')
  assert.equal(iconOf('Unknown subject'), null)
})

test('two subjects never share an icon, the same subject keeps one', () => {
  // Both are languages: the second takes its next match, then a fallback.
  const iconOf = assignSubjectIcons(['Anglais', 'Espagnol', 'Anglais', 'Option libre', 'Atelier'], 'carbon')
  const icons = ['Anglais', 'Espagnol', 'Option libre', 'Atelier'].map(iconOf)

  assert.equal(iconOf('Anglais'), 'carbon:translate')
  assert.equal(new Set(icons).size, icons.length)
  assert.ok(icons.every(Boolean))
})

test('more subjects than icons still each get one', () => {
  const titles = Array.from({ length: 15 }, (_, index) => `Matière ${index + 1}`)
  const iconOf = assignSubjectIcons(titles, 'tabler')
  assert.ok(titles.every((title) => iconOf(title)?.startsWith('tabler:')))
})

test('each style draws from its own set', () => {
  assert.equal(assignSubjectIcons(['Mathématiques'], 'carbon')('Mathématiques'), 'carbon:function-math')
  assert.equal(assignSubjectIcons(['Mathématiques'], 'phosphor')('Mathématiques'), 'ph:function')
  assert.equal(assignSubjectIcons(['Mathématiques'], 'phosphor-fill')('Mathématiques'), 'ph:function-fill')
  assert.equal(assignSubjectIcons(['Mathématiques'], 'tabler')('Mathématiques'), 'tabler:math-function')
  // Unknown style: the tiles' default, Carbon.
  assert.equal(assignSubjectIcons(['Mathématiques'], undefined)('Mathématiques'), 'carbon:function-math')
})
