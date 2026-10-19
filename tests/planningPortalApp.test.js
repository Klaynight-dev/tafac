import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getPlanningOrigin,
  isPlanningPortalApp,
  opensPlanningPageInApp,
} from '../src/planningPortalApp.js'

const PLANNING_ORIGIN = 'https://planning.univ-rennes.fr'
const SERVICE_URL = `${PLANNING_ORIGIN}/portal/planning/calendar`
const OPTIONS = {
  planningOrigin: PLANNING_ORIGIN,
  appKeys: ['demo-emploi-du-temps'],
  base: 'https://tafac.fr/',
  launchPath: '/__ent_auth/launch',
  casOrigin: 'https://sso-cas.univ-rennes.fr',
}
const PLANNING_APP = { id: 'planning', fname: 'mon-emploi-du-temps', title: 'Planning', href: SERVICE_URL, target: '_blank' }
const DEMO_APP = { id: 'demo-planning', fname: 'demo-emploi-du-temps', title: 'Emplois du temps', href: 'https://calendar.google.com/', target: '_blank' }

test('the planning service origin comes from its service URL', () => {
  assert.equal(getPlanningOrigin(SERVICE_URL), PLANNING_ORIGIN)
  assert.equal(getPlanningOrigin(''), null)
  assert.equal(getPlanningOrigin(undefined), null)
  assert.equal(getPlanningOrigin('not a url'), null)
})

test('an app linking to the planning service, directly or wrapped, is the planning', () => {
  assert.equal(isPlanningPortalApp(PLANNING_APP, OPTIONS), true)
  assert.equal(isPlanningPortalApp({ title: 'Planning', href: `${PLANNING_ORIGIN}/` }, OPTIONS), true)
  assert.equal(isPlanningPortalApp({ title: 'Planning', href: `/__ent_auth/launch?url=${encodeURIComponent(SERVICE_URL)}` }, OPTIONS), true)
  assert.equal(isPlanningPortalApp({ title: 'Planning', href: `https://sso-cas.univ-rennes.fr/login?service=${encodeURIComponent(SERVICE_URL)}` }, OPTIONS), true)
})

test('a portal entry counts through its resolved launch link', () => {
  const portalEntry = { fname: 'mon-emploi-du-temps', title: 'Planning', href: '/__ent_proxy/f/mon-emploi-du-temps/max/render.uP' }
  assert.equal(isPlanningPortalApp(portalEntry, OPTIONS), false)
  assert.equal(isPlanningPortalApp(portalEntry, { ...OPTIONS, resolvedHref: SERVICE_URL }), true)
})

test('the demo planning app counts by its key, whatever its link', () => {
  assert.equal(isPlanningPortalApp(DEMO_APP, OPTIONS), true)
  assert.equal(isPlanningPortalApp({ id: 'demo-emploi-du-temps', title: 'Emplois du temps', href: 'https://calendar.google.com/' }, OPTIONS), true)
  assert.equal(isPlanningPortalApp(DEMO_APP, { ...OPTIONS, appKeys: [] }), false)
})

test('titles, lookalike hosts and other apps are not the planning', () => {
  assert.equal(isPlanningPortalApp({ title: 'Emplois du temps', href: 'https://example.org/' }, OPTIONS), false)
  assert.equal(isPlanningPortalApp({ title: 'Moodle', href: 'https://foad.univ-rennes.fr/' }, OPTIONS), false)
  assert.equal(isPlanningPortalApp({ title: 'Planning', href: 'https://planning.univ-rennes.fr.evil.example/' }, OPTIONS), false)
  assert.equal(isPlanningPortalApp({ title: 'Planning', href: `/__ent_auth/launch?url=${encodeURIComponent('https://foad.univ-rennes.fr/')}` }, OPTIONS), false)
  assert.equal(isPlanningPortalApp(PLANNING_APP, { ...OPTIONS, planningOrigin: null }), false)
  assert.equal(isPlanningPortalApp(null, OPTIONS), false)
})

test('the tile opens the Planning page only when the student has the page', () => {
  assert.equal(opensPlanningPageInApp(PLANNING_APP, { ...OPTIONS, hasPlanningPage: true }), true)
  assert.equal(opensPlanningPageInApp(DEMO_APP, { ...OPTIONS, hasPlanningPage: true }), true)
  assert.equal(opensPlanningPageInApp(PLANNING_APP, { ...OPTIONS, hasPlanningPage: false }), false)
  assert.equal(opensPlanningPageInApp(PLANNING_APP, OPTIONS), false)
  assert.equal(opensPlanningPageInApp({ title: 'Moodle', href: 'https://foad.univ-rennes.fr/' }, { ...OPTIONS, hasPlanningPage: true }), false)
})
