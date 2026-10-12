import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getBriefingSources, subscribeBriefingSources } from './briefingSources'

// Order of the mail and deadlines cards when both are shown: whichever has
// more waiting (unread mails vs deadlines due within 48 h) goes first, mail
// on a tie. Decided once per page load, so a background refresh never swaps
// the cards under the student's eyes. The last decision is stored for the
// device, so the next visit starts in that order instead of jumping.
// Phones only (the swipeable strip, below Tailwind's xs breakpoint), where
// just one card shows at a time: wider screens keep mail, then deadlines.
const LIST_CARDS_ORDER_KEY = 'l-ent:list-cards-order'
const PHONE_LAYOUT_QUERY = '(width < 520px)'

function subscribePhoneLayout(onChange) {
  const query = window.matchMedia(PHONE_LAYOUT_QUERY)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getIsPhoneLayout() {
  return window.matchMedia(PHONE_LAYOUT_QUERY).matches
}

function readStoredOrder() {
  try {
    return JSON.parse(localStorage.getItem(LIST_CARDS_ORDER_KEY) || 'null')?.value === 'deadlines' ? 'deadlines' : 'mail'
  } catch {
    return 'mail'
  }
}

function persistOrder(first) {
  try {
    if (first === 'mail') {
      localStorage.removeItem(LIST_CARDS_ORDER_KEY)
    } else {
      localStorage.setItem(LIST_CARDS_ORDER_KEY, JSON.stringify({ value: first }))
    }
  } catch {
    // Storage unavailable
  }
}

// 'mail' or 'deadlines': the card to show first.
export function useListCardOrder() {
  const sources = useSyncExternalStore(subscribeBriefingSources, getBriefingSources)
  const isPhoneLayout = useSyncExternalStore(subscribePhoneLayout, getIsPhoneLayout)
  const [first, setFirst] = useState(readStoredOrder)
  const isDecidedRef = useRef(false)

  useEffect(() => {
    const { mailCount, deadlinesCount } = sources
    if (isDecidedRef.current || typeof mailCount !== 'number' || typeof deadlinesCount !== 'number') {
      return
    }

    isDecidedRef.current = true
    const next = deadlinesCount > mailCount ? 'deadlines' : 'mail'
    setFirst(next)
    persistOrder(next)
  }, [sources])

  return isPhoneLayout ? first : 'mail'
}
