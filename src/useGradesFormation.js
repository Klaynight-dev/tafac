import { useEffect, useState } from 'react'
import { getGradesFormation } from './entApi'

// The signed-in student's relevé kind (see getGradesFormation): 'BUT',
// 'other' or null while unknown. Read from the grades request the dashboard
// makes anyway (cached), again when the student changes. Everything
// BUT-specific hides only on 'other', so a BUT student never sees it flicker.
export default function useGradesFormation({ enabled, user }) {
  const [state, setState] = useState({ user: null, kind: null })

  useEffect(() => {
    if (!enabled) return undefined
    let cancelled = false
    getGradesFormation()
      .then((kind) => {
        if (!cancelled) setState({ user, kind })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [enabled, user])

  return enabled && state.user === user ? state.kind : null
}
