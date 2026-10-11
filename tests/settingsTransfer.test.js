import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import test from 'node:test'
import { buildSettingsTransferUrl, importTransferredSettings } from '../src/settingsTransfer.js'

function createStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    entries: () => Object.fromEntries(map),
  }
}

function openLink(url, storage) {
  // Behaves like window.location: replaceState drops the hash at once.
  const location = new URL(url)
  const replaced = []
  const imported = importTransferredSettings({
    location,
    history: {
      state: null,
      replaceState: (_state, _title, next) => {
        replaced.push(next)
        location.hash = ''
      },
    },
    storage,
  })
  return { imported, replaced }
}

test('settings survive the trip from the old address', () => {
  const oldSite = createStorage({
    'l-ent:establishment': '{"user":"jdupont","value":"iutlan"}',
    'l-ent:weather-city': 'Lannion — Côtes-d’Armor',
    'l-ent:next-class-cache': '{"events":[]}',
    'l-ent:custom-background': 'data:image/webp;base64,AAAA',
  })
  const url = buildSettingsTransferUrl('https://tafac.fr/', oldSite)
  assert.match(url, /^https:\/\/tafac\.fr\/#import=[\w-]+$/)

  const newSite = createStorage()
  const { imported, replaced } = openLink(url, newSite)
  assert.equal(imported, 2)
  assert.deepEqual(newSite.entries(), {
    'l-ent:establishment': '{"user":"jdupont","value":"iutlan"}',
    'l-ent:weather-city': 'Lannion — Côtes-d’Armor',
  })
  assert.deepEqual(replaced, ['/'])
})

test('settings already set on Tafac are kept', () => {
  const url = buildSettingsTransferUrl('https://tafac.fr', createStorage({ 'l-ent:weather-city': 'Brest' }))
  const newSite = createStorage({ 'l-ent:weather-city': 'Rennes' })
  assert.equal(openLink(url, newSite).imported, 0)
  assert.equal(newSite.getItem('l-ent:weather-city'), 'Rennes')
})

test('unknown keys and broken links are ignored', () => {
  const payload = Buffer.from(JSON.stringify({ 'l-ent:session-cache': 'x', other: 'y' })).toString('base64url')
  const storage = createStorage()
  assert.equal(openLink(`https://tafac.fr/#import=${payload}`, storage).imported, 0)
  assert.equal(openLink('https://tafac.fr/#import=%%%', storage).imported, 0)
  assert.equal(openLink('https://tafac.fr/#import=', storage).imported, 0)
  assert.deepEqual(storage.entries(), {})

  const untouched = openLink('https://tafac.fr/#about', storage)
  assert.deepEqual(untouched, { imported: 0, replaced: [] })
})
