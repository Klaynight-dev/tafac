// Certificat de scolarité from ESUP MonDossierWeb (fr.univlorraine.mondossierweb),
// a Vaadin 8 app behind CAS. There is no download API: the PDF link only exists
// inside a live Vaadin UI, so the server plays the browser's part, with the
// student's session cookie jar:
//   1. GET /                  → page with vaadin.initApplication("ROOT-…")
//   2. POST /?v-<time>        → the UI (id, CSRF key, components)
//   3. POST /UIDL/?v-uiId=…   → "click" the « Inscriptions » menu button; the
//                               answer lists one FileDownloader per year
//   4. GET  /APP/connector/…  → the PDF of the most recent year
// Nothing is stored: the PDF is streamed back to the student.

// Matches what Vaadin's client sends; the values only size the UI.
const BROWSER_DETAILS = {
  'v-sh': '900',
  'v-sw': '1440',
  'v-cw': '1440',
  'v-ch': '900',
  'v-tzo': '-60',
  'v-dstd': '60',
  'v-rtzo': '-60',
  'v-dston': 'false',
  'v-tzid': 'Europe/Paris',
  'v-vw': '1440',
  'v-vh': '0',
}

const CLICK_DETAILS = {
  altKey: false,
  button: 'LEFT',
  clientX: 1,
  clientY: 1,
  ctrlKey: false,
  metaKey: false,
  relativeX: 1,
  relativeY: 1,
  shiftKey: false,
  type: 1,
}

export class SchoolCertificateUnavailableError extends Error {}

export function extractVaadinAppId(html) {
  return String(html ?? '').match(/vaadin\.initApplication\("([^"]+)"/)?.[1] ?? null
}

export function buildBrowserDetailsBody(appId, pageUrl, now = Date.now()) {
  return new URLSearchParams({
    'v-browserDetails': '1',
    theme: 'valo-ul',
    'v-appId': appId,
    ...BROWSER_DETAILS,
    'v-curdate': String(now),
    'v-loc': pageUrl,
    'v-wn': `${appId}-0.5`,
  }).toString()
}

// Vaadin prefixes JSON answers with "for(;;);" against JSON hijacking.
function parseVaadinJson(text) {
  return JSON.parse(String(text ?? '').replace(/^for\(;;\);/, ''))
}

// Step 2's answer: { "v-uiId": 3, "uidl": "<json string>" }.
export function parseInitialUi(text) {
  const payload = parseVaadinJson(text)
  const uidl = typeof payload?.uidl === 'string' ? JSON.parse(payload.uidl) : null
  if (!uidl || payload['v-uiId'] == null || !uidl['Vaadin-Security-Key']) {
    throw new SchoolCertificateUnavailableError('MonDossierWeb did not start a UI.')
  }

  return {
    uiId: payload['v-uiId'],
    csrfToken: uidl['Vaadin-Security-Key'],
    syncId: uidl.syncId ?? 0,
    clientId: uidl.clientId ?? 0,
    state: uidl.state ?? {},
  }
}

export function findButtonIdByCaption(state, caption) {
  const wanted = caption.trim().toLowerCase()
  return Object.entries(state ?? {})
    .find(([, value]) => typeof value?.caption === 'string' && value.caption.trim().toLowerCase() === wanted)?.[0] ?? null
}

export function buildClickBody({ csrfToken, syncId, clientId }, buttonId) {
  return JSON.stringify({
    csrfToken,
    rpc: [[buttonId, 'com.vaadin.shared.ui.button.ButtonServerRpc', 'click', [CLICK_DETAILS]]],
    syncId,
    clientId,
  })
}

// Step 3's answer: every FileDownloader whose file is a certificate, newest
// school year first ("…_2026-2027_….pdf").
export function findCertificateDownloads(text) {
  const messages = parseVaadinJson(text)
  const downloads = []

  for (const message of Array.isArray(messages) ? messages : [messages]) {
    for (const value of Object.values(message?.state ?? {})) {
      const url = value?.resources?.dl?.uRL
      if (typeof url !== 'string' || !url.startsWith('app://')) continue

      const path = url.slice('app://'.length)
      const filename = decodeURIComponent(path.split('/').pop() ?? '')
      if (!/certificat/i.test(filename)) continue

      const year = Number(filename.match(/(\d{4})-\d{4}/)?.[1] ?? 0)
      downloads.push({ path, filename, year })
    }
  }

  return downloads.sort((left, right) => right.year - left.year)
}

// "2026-2027" for the menu, from the newest download's file name.
export function describeSchoolYear(download) {
  return download?.filename.match(/\d{4}-\d{4}/)?.[0] ?? null
}

// Steps 1 to 3. `followRedirectChain` and `fetchWithJar` are the server's
// cookie-jar helpers (entAuthApp.js), passed in so tests can fake them.
export async function openCertificateDownload({ origin, jar, menuCaption = 'Inscriptions', followRedirectChain, fetchWithJar, now = Date.now }) {
  const rootUrl = `${origin.replace(/\/$/, '')}/`
  const page = await followRedirectChain(rootUrl, jar, { headers: { Accept: 'text/html,application/xhtml+xml,*/*' } })
  const html = await page.response.text()
  const appId = extractVaadinAppId(html)
  if (!page.response.ok || !appId) {
    // A CAS login form or an error page instead of the app: not signed in there.
    throw new SchoolCertificateUnavailableError('MonDossierWeb is not reachable with this session.')
  }

  const initResponse = await fetchWithJar(`${rootUrl}?v-${now()}`, jar, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', Referer: rootUrl },
    body: buildBrowserDetailsBody(appId, rootUrl, now()),
  })
  const ui = parseInitialUi(await initResponse.text())

  const menuButtonId = findButtonIdByCaption(ui.state, menuCaption)
  if (!menuButtonId) {
    throw new SchoolCertificateUnavailableError(`No « ${menuCaption} » menu in MonDossierWeb.`)
  }

  const clickResponse = await fetchWithJar(`${rootUrl}UIDL/?v-uiId=${encodeURIComponent(ui.uiId)}`, jar, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8', Accept: 'application/json', Referer: rootUrl },
    body: buildClickBody(ui, menuButtonId),
  })
  const [latest] = findCertificateDownloads(await clickResponse.text())
  if (!latest) {
    throw new SchoolCertificateUnavailableError('No certificate offered for this student.')
  }

  return { ...latest, url: `${rootUrl}${latest.path}`, schoolYear: describeSchoolYear(latest) }
}

// A one-page PDF for the demo account, so the button does something there.
export function buildDemoCertificatePdf(schoolYear) {
  const text = `Certificat de scolarite - compte demo (${schoolYear})`
  const content = `BT /F1 18 Tf 72 760 Td (${text}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(pdf, 'latin1')
}
