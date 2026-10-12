// Light/dark theme (Réglages › Apparence). Stored for the device rather than
// per account: index.html applies it before anyone is signed in, so the page
// never flashes the wrong theme. Keep THEME_KEY and the resolution below in
// sync with the inline script there.

export const THEME_KEY = 'l-ent:theme'
export const THEME_OPTIONS = ['auto', 'light', 'dark']

// Browser chrome colour (address bar, PWA status bar) for each theme.
const THEME_COLORS = { light: '#FCFBF8', dark: '#0f0f0f' }

function getSystemDarkQuery() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null
}

export function getStoredTheme() {
  try {
    const stored = JSON.parse(localStorage.getItem(THEME_KEY) || 'null')
    return THEME_OPTIONS.includes(stored?.value) ? stored.value : 'auto'
  } catch {
    return 'auto'
  }
}

export function persistTheme(theme) {
  try {
    if (theme === 'auto') {
      localStorage.removeItem(THEME_KEY)
    } else {
      localStorage.setItem(THEME_KEY, JSON.stringify({ value: theme }))
    }
  } catch {
    // Storage unavailable
  }
}

function applyTheme(theme) {
  const resolved = theme === 'auto'
    ? (getSystemDarkQuery()?.matches ? 'dark' : 'light')
    : theme
  document.documentElement.dataset.theme = resolved

  // index.html ships one theme-color per system scheme; a forced theme
  // paints both with its own colour.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const scheme = theme === 'auto'
      ? (meta.media.includes('dark') ? 'dark' : 'light')
      : resolved
    meta.content = THEME_COLORS[scheme]
  }
}

// Applies `theme` now and, for "auto", again whenever the system switches.
// Returns the cleanup.
export function watchTheme(theme) {
  applyTheme(theme)

  const query = getSystemDarkQuery()
  if (theme !== 'auto' || !query) {
    return () => {}
  }

  const handleChange = () => applyTheme('auto')
  query.addEventListener('change', handleChange)
  return () => query.removeEventListener('change', handleChange)
}
