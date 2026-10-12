import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SchoolCertificateUnavailableError,
  buildBrowserDetailsBody,
  buildClickBody,
  buildDemoCertificatePdf,
  extractVaadinAppId,
  findButtonIdByCaption,
  findCertificateDownloads,
  openCertificateDownload,
  parseInitialUi,
} from '../server/schoolCertificate.js'

// Shapes recorded from MonDossierWeb (Vaadin 8), with a made-up student.
const PAGE_HTML = '<div id="ROOT-1234567" class="v-app"></div><script>vaadin.initApplication("ROOT-1234567",{"serviceUrl":"."});</script>'
const INIT_RESPONSE = JSON.stringify({
  'v-uiId': 3,
  uidl: JSON.stringify({
    'Vaadin-Security-Key': 'csrf-token',
    syncId: 0,
    clientId: 0,
    state: {
      544: { caption: 'Etat-civil', styles: ['selected'] },
      547: { caption: 'Inscriptions' },
      549: { caption: 'Notes & résultats' },
    },
  }),
})
const CLICK_RESPONSE = `for(;;);${JSON.stringify([{
  syncId: 4,
  state: {
    645: { caption: 'Certificat de scolarité ' },
    646: { resources: { dl: { uRL: 'app://APP/connector/3/646/dl/Certificat_de_Scolarit%C3%A9_X0001_2026-2027_JANE_DOE.pdf' } } },
    652: { resources: { dl: { uRL: 'app://APP/connector/3/652/dl/Certificat_de_Scolarit%C3%A9_X0001_2025-2026_JANE_DOE.pdf' } } },
    660: { resources: { dl: { uRL: 'app://APP/connector/3/660/dl/Releve_de_notes_2025-2026.pdf' } } },
  },
}])}`

test('reads the Vaadin app id and builds the browser details', () => {
  assert.equal(extractVaadinAppId(PAGE_HTML), 'ROOT-1234567')
  assert.equal(extractVaadinAppId('<p>CAS</p>'), null)
  const body = new URLSearchParams(buildBrowserDetailsBody('ROOT-1234567', 'https://mdw.example/', 42))
  assert.equal(body.get('v-browserDetails'), '1')
  assert.equal(body.get('v-appId'), 'ROOT-1234567')
  assert.equal(body.get('v-loc'), 'https://mdw.example/')
  assert.equal(body.get('v-curdate'), '42')
})

test('parses the initial UI and finds the menu button', () => {
  const ui = parseInitialUi(INIT_RESPONSE)
  assert.deepEqual([ui.uiId, ui.csrfToken, ui.syncId, ui.clientId], [3, 'csrf-token', 0, 0])
  assert.equal(findButtonIdByCaption(ui.state, 'inscriptions'), '547')
  assert.equal(findButtonIdByCaption(ui.state, 'Absences'), null)
  assert.throws(() => parseInitialUi('{}'), SchoolCertificateUnavailableError)

  const click = JSON.parse(buildClickBody(ui, '547'))
  assert.deepEqual(click.rpc[0].slice(0, 3), ['547', 'com.vaadin.shared.ui.button.ButtonServerRpc', 'click'])
  assert.equal(click.csrfToken, 'csrf-token')
})

test('lists certificates only, newest school year first', () => {
  const downloads = findCertificateDownloads(CLICK_RESPONSE)
  assert.deepEqual(downloads.map(({ year }) => year), [2026, 2025])
  assert.equal(downloads[0].path, 'APP/connector/3/646/dl/Certificat_de_Scolarit%C3%A9_X0001_2026-2027_JANE_DOE.pdf')
  assert.equal(downloads[0].filename, 'Certificat_de_Scolarité_X0001_2026-2027_JANE_DOE.pdf')
})

test('openCertificateDownload plays the three steps with the session jar', async () => {
  const calls = []
  const jar = {}
  const response = (text, ok = true) => ({ ok, text: async () => text })
  const result = await openCertificateDownload({
    origin: 'https://mdw.example',
    jar,
    now: () => 1000,
    followRedirectChain: async (url, usedJar) => {
      calls.push(['page', url, usedJar === jar])
      return { response: response(PAGE_HTML) }
    },
    fetchWithJar: async (url, usedJar, options) => {
      calls.push([options.method, url, usedJar === jar])
      return response(url.includes('UIDL') ? CLICK_RESPONSE : INIT_RESPONSE)
    },
  })

  assert.deepEqual(calls, [
    ['page', 'https://mdw.example/', true],
    ['POST', 'https://mdw.example/?v-1000', true],
    ['POST', 'https://mdw.example/UIDL/?v-uiId=3', true],
  ])
  assert.equal(result.url, 'https://mdw.example/APP/connector/3/646/dl/Certificat_de_Scolarit%C3%A9_X0001_2026-2027_JANE_DOE.pdf')
  assert.equal(result.schoolYear, '2026-2027')
})

test('a CAS page instead of the app, or no certificate, is "unavailable"', async () => {
  const notSignedIn = {
    origin: 'https://mdw.example',
    jar: {},
    followRedirectChain: async () => ({ response: { ok: true, text: async () => '<form id="fm1">CAS</form>' } }),
    fetchWithJar: async () => assert.fail('no Vaadin call without the app'),
  }
  await assert.rejects(openCertificateDownload(notSignedIn), SchoolCertificateUnavailableError)

  const noCertificate = {
    origin: 'https://mdw.example',
    jar: {},
    followRedirectChain: async () => ({ response: { ok: true, text: async () => PAGE_HTML } }),
    fetchWithJar: async (url) => ({ ok: true, text: async () => (url.includes('UIDL') ? 'for(;;);[{"state":{}}]' : INIT_RESPONSE) }),
  }
  await assert.rejects(openCertificateDownload(noCertificate), SchoolCertificateUnavailableError)
})

test('the demo certificate is a PDF', () => {
  const pdf = buildDemoCertificatePdf('2026-2027').toString('latin1')
  assert.ok(pdf.startsWith('%PDF-1.4'))
  assert.ok(pdf.includes('2026-2027'))
  assert.ok(pdf.trimEnd().endsWith('%%EOF'))
})
