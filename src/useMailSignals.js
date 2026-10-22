import { useEffect, useState } from 'react'
import universityConfig from '@university'
import { getMailMessages } from './entApi'
import { detectMailSignals } from './mailSignals'

// The inbox read once for the dashboard, the planning and "Prochain cours"
// together, again after 10 minutes.
const TTL_MS = 10 * 60 * 1000
let cache = null

function loadSignals() {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    cache = {
      at: Date.now(),
      promise: getMailMessages({ limit: 30 })
        .then((result) => (result.status === 'ok' ? detectMailSignals(result.messages) : []))
        .catch(() => []),
    }
  }
  return cache.promise
}

// What the student's mails announce (mailSignals): [] until read, or
// without the mail feature.
export function useMailSignals(enabled = true) {
  const [signals, setSignals] = useState([])
  useEffect(() => {
    if (!enabled || !universityConfig.features?.mail) return undefined
    let alive = true
    loadSignals().then((list) => {
      if (alive) setSignals(list)
    })
    return () => {
      alive = false
    }
  }, [enabled])
  return signals
}
