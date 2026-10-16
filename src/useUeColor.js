import { useCallback, useSyncExternalStore } from 'react'
import { liftForDarkSurface } from './colorContrast'

// Whether the page is dark right now: <html data-theme>, which theme.js
// sets from Réglages › Apparence or the system (and follows it when "auto").
// Watched on the attribute itself, so a component re-renders as it flips.
function subscribe(onChange) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function readIsDark() {
  return document.documentElement.dataset.theme === 'dark'
}

export function useIsDarkTheme() {
  return useSyncExternalStore(subscribe, readIsDark, () => false)
}

// UE colours as they're painted: ScoDoc's own in the light theme, lifted on
// the dark one when they'd melt into its cards (liftForDarkSurface: a navy
// UE becomes a readable blue). Every place that paints a UE colour (rings,
// ribbons, tags, washes, coins) goes through it, so a UE keeps one colour
// across the page. Returns a function of the colour; null stays null.
export function useUeColor() {
  const isDark = useIsDarkTheme()
  return useCallback((color) => (isDark && color ? liftForDarkSurface(color) : color), [isDark])
}
