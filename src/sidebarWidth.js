// Width of the desktop sidebar, dragged from its right edge. Stored for the
// device (like the theme) and exposed as --sidebar-width on <html>, which
// both the sidebar and the dashboard column's left padding read.

export const SIDEBAR_WIDTH_KEY = 'l-ent:sidebar-width'
export const DEFAULT_SIDEBAR_WIDTH = 280
// Narrow enough to give the dashboard room, wide enough for the logo lockup
// and "Toutes les applications" on one line.
export const MIN_SIDEBAR_WIDTH = 264
export const MAX_SIDEBAR_WIDTH = 400

export function clampSidebarWidth(width) {
  const numeric = Math.round(Number(width))
  if (!Number.isFinite(numeric)) return DEFAULT_SIDEBAR_WIDTH
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, numeric))
}

export function getStoredSidebarWidth() {
  try {
    const stored = JSON.parse(localStorage.getItem(SIDEBAR_WIDTH_KEY) || 'null')
    return stored?.value == null ? DEFAULT_SIDEBAR_WIDTH : clampSidebarWidth(stored.value)
  } catch {
    return DEFAULT_SIDEBAR_WIDTH
  }
}

export function persistSidebarWidth(width) {
  try {
    if (width === DEFAULT_SIDEBAR_WIDTH) {
      localStorage.removeItem(SIDEBAR_WIDTH_KEY)
    } else {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, JSON.stringify({ value: width }))
    }
  } catch {
    // Storage unavailable
  }
}

export function applySidebarWidth(width) {
  document.documentElement.style.setProperty('--sidebar-width', `${width}px`)
}
