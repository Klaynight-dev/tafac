import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getGradesOrigin,
  isGradesPortalApp,
  isGradesPortalHref,
  opensGradesPageInApp,
} from '../src/gradesPortalApp.js'

const GRADES_ORIGIN = 'https://notes9.iutlan.univ-rennes1.fr'
const SERVICE_URL = `${GRADES_ORIGIN}/services/doAuth.php?href=${encodeURIComponent(`${GRADES_ORIGIN}/`)}`
const OPTIONS = {
  gradesOrigin: GRADES_ORIGIN,
  base: 'https://tafac.fr/',
  launchPath: '/__ent_auth/launch',
  casOrigin: 'https://sso-cas.univ-rennes.fr',
}
const NOTES_APP = { id: 'lent-iutlan-notes9', title: 'Notes IUT Lannion', href: SERVICE_URL, target: '_blank' }

test('the grade service origin comes from its service URL', () => {
  assert.equal(getGradesOrigin(SERVICE_URL), GRADES_ORIGIN)
  assert.equal(getGradesOrigin(''), null)
  assert.equal(getGradesOrigin(undefined), null)
  assert.equal(getGradesOrigin('not a url'), null)
})

test('any path on the grade service origin is the grades portal', () => {
  assert.equal(isGradesPortalHref(SERVICE_URL, OPTIONS), true)
  assert.equal(isGradesPortalHref(`${GRADES_ORIGIN}/`, OPTIONS), true)
  assert.equal(isGradesPortalHref(`${GRADES_ORIGIN}/services/data.php?q=relevéEtudiant`, OPTIONS), true)
})

test('the launch relay and a CAS login leading there count', () => {
  assert.equal(isGradesPortalHref(`/__ent_auth/launch?url=${encodeURIComponent(SERVICE_URL)}`, OPTIONS), true)
  assert.equal(isGradesPortalHref(`https://sso-cas.univ-rennes.fr/login?service=${encodeURIComponent(SERVICE_URL)}`, OPTIONS), true)
  // Same wrappers, somewhere else.
  assert.equal(isGradesPortalHref(`/__ent_auth/launch?url=${encodeURIComponent('https://foad.univ-rennes.fr/')}`, OPTIONS), false)
  assert.equal(isGradesPortalHref(`https://sso-cas.univ-rennes.fr/login?service=${encodeURIComponent('https://foad.univ-rennes.fr/')}`, OPTIONS), false)
  // A `url` parameter on any other page is not a relay.
  assert.equal(isGradesPortalHref(`https://example.org/go?url=${encodeURIComponent(SERVICE_URL)}`, OPTIONS), false)
  assert.equal(isGradesPortalHref(`/__ent_proxy/f/x?url=${encodeURIComponent(SERVICE_URL)}`, OPTIONS), false)
})

test('lookalike hosts and other apps are not the grades portal', () => {
  assert.equal(isGradesPortalHref('https://notes9.iutlan.univ-rennes1.fr.evil.example/', OPTIONS), false)
  assert.equal(isGradesPortalHref('http://notes9.iutlan.univ-rennes1.fr/', OPTIONS), false)
  assert.equal(isGradesPortalHref('https://foad.univ-rennes.fr/', OPTIONS), false)
  assert.equal(isGradesPortalHref('/__ent_proxy/f/services/p/notes/max/render.uP', OPTIONS), false)
  assert.equal(isGradesPortalHref('', OPTIONS), false)
  assert.equal(isGradesPortalHref(SERVICE_URL, { ...OPTIONS, gradesOrigin: null }), false)
})

test('the title alone never makes an app the grades portal', () => {
  assert.equal(isGradesPortalApp({ title: 'Notes IUT Lannion', href: 'https://example.org/' }, OPTIONS), false)
  assert.equal(isGradesPortalApp({ title: 'Loxya', href: SERVICE_URL }, OPTIONS), true)
})

test('a portal entry counts through its resolved launch link', () => {
  const portalEntry = { fname: 'notes-iut', title: 'Notes', href: '/__ent_proxy/f/notes-iut/max/render.uP' }
  assert.equal(isGradesPortalApp(portalEntry, OPTIONS), false)
  assert.equal(isGradesPortalApp(portalEntry, { ...OPTIONS, resolvedHref: SERVICE_URL }), true)
  assert.equal(isGradesPortalApp(null, OPTIONS), false)
})

test('the tile opens « Mes notes » only when the student has the page', () => {
  assert.equal(opensGradesPageInApp(NOTES_APP, { ...OPTIONS, hasGradesPage: true }), true)
  assert.equal(opensGradesPageInApp(NOTES_APP, { ...OPTIONS, hasGradesPage: false }), false)
  assert.equal(opensGradesPageInApp(NOTES_APP, OPTIONS), false)
  assert.equal(opensGradesPageInApp({ title: 'Moodle', href: 'https://foad.univ-rennes.fr/' }, { ...OPTIONS, hasGradesPage: true }), false)
})
