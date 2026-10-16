import { useEffect, useRef } from 'react'
import Dropdown from './Dropdown'

function formatSemester(semester) {
  const name = semester.number != null ? `Semestre ${semester.number}` : semester.title ?? 'Semestre'
  return semester.year ? `${name} · ${semester.year}` : name
}

// The phone chip's short form ("S2"); the full label without a number.
function formatShortSemester(semester) {
  return semester.number != null ? `S${semester.number}` : formatSemester(semester)
}

// How far a gesture scrolls before it moves one semester, and the pause
// that ends a gesture (a trackpad's inertia keeps sending wheel events).
const WHEEL_THRESHOLD = 24
const GESTURE_GAP_MS = 200

// Semester picker for the ScoDoc pages, next to the page title: plain text
// with a chevron (a short chip on phones), the app's dropdown menu.
// `className` places it in the title row. Feed it from useScodocReleve()
// (`semesters`, `activeId`, `selectSemester`): the pick then carries from one
// page to the next. Nothing to pick with a single semester.
// Scrolling over it (closed) steps through the semesters, one per gesture,
// down the list as the wheel goes down; the page doesn't scroll meanwhile.
function SemesterSelect({ semesters, value, onChange, className = '' }) {
  const wrapperRef = useRef(null)
  const latestRef = useRef({ semesters, value, onChange })
  const hasChoice = Boolean(semesters && semesters.length >= 2)

  useEffect(() => {
    latestRef.current = { semesters, value, onChange }
  })

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!hasChoice || !wrapper) return undefined
    let accumulated = 0
    let lastWheelAt = 0
    let steppedThisGesture = false

    const handleWheel = (event) => {
      // Open menu: its own scrolling.
      if (wrapper.querySelector('[aria-expanded="true"]')) return
      event.preventDefault()
      const now = performance.now()
      if (now - lastWheelAt > GESTURE_GAP_MS) {
        accumulated = 0
        steppedThisGesture = false
      }
      lastWheelAt = now
      if (steppedThisGesture) return
      accumulated += Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return
      steppedThisGesture = true
      const { semesters: list, value: current, onChange: change } = latestRef.current
      const index = list.findIndex((semester) => semester.id === current)
      const next = list[index + (accumulated > 0 ? 1 : -1)]
      if (index !== -1 && next) change(next.id)
    }

    wrapper.addEventListener('wheel', handleWheel, { passive: false })
    return () => wrapper.removeEventListener('wheel', handleWheel)
  }, [hasChoice])

  if (!hasChoice) {
    return null
  }

  const selected = semesters.find((semester) => semester.id === value)
  // On a phone the plain text becomes a chip beside the title, "S2" (40px,
  // its touch area 44px); its accessible name and the menu keep the full
  // label. Its text is set on the wrapper: a button takes its font from its
  // parent here (index.css), not its classes.
  return (
    <span ref={wrapperRef} className={`inline-flex max-md:min-w-0 max-md:max-w-full max-md:font-body max-md:text-[15px] max-md:font-semibold max-md:leading-none ${className}`}>
      <Dropdown
        label="Semestre"
        options={semesters.map((semester) => ({ value: semester.id, label: formatSemester(semester) }))}
        value={value}
        onChange={onChange}
        className="max-md:max-w-full"
        triggerLabel={selected ? (
          <>
            <span className="max-md:hidden">{formatSemester(selected)}</span>
            <span className="md:hidden">{formatShortSemester(selected)}</span>
          </>
        ) : null}
        triggerClassName="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-body text-[15px] font-semibold leading-none text-text-secondary cursor-pointer transition-colors duration-150 hover:text-text focus-visible:text-text focus-visible:outline-none focus-visible:underline underline-offset-4 max-md:relative max-md:min-h-10 max-md:min-w-11 max-md:max-w-full max-md:gap-1 max-md:rounded-full max-md:border max-md:border-border max-md:bg-widget-bg max-md:pr-2.5 max-md:pl-3.5 max-md:text-text max-md:shadow-xs max-md:no-underline max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-[3px] max-md:focus-visible:outline-2 max-md:focus-visible:outline-offset-2 max-md:focus-visible:outline-brand"
      />
    </span>
  )
}

export default SemesterSelect
