import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// Pages swiped sideways with a finger (the planning's days, its week strip),
// as the iOS app's DatePager: the page and its two neighbours side by side,
// a swipe lands past half a page or on a flick, and the new page is chosen
// as the finger lifts (`onSwipe`), so whatever follows it moves at once.
// Any other change of `value` slides there as one page, whatever the
// distance. Vertical scrolling stays the browser's (touch-action: pan-y);
// a mouse doesn't drag, the page's buttons and keys do.
// `step(value, n)`: the page n steps away; `compare(a, b)`: > 0 when a
// comes after b.
const SLIDE = 'transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1)'
const LANDING_SPEED = 0.25

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function SwipePager({ value, step, compare, renderPage, onSwipe, className = '', label }) {
  const [shown, setShown] = useState(value)
  // `slide`: { target, dir, running }, dir 0 for a swipe that springs back.
  const [slide, setSlide] = useState(null)
  const [dragX, setDragX] = useState(null)
  const gestureRef = useRef(null)
  const suppressClickRef = useRef(false)
  const containerRef = useRef(null)

  // Another change: one slide to it, once the current one is over.
  useEffect(() => {
    if (value === shown || slide || dragX !== null) return
    if (prefersReducedMotion()) {
      setShown(value)
      return
    }
    setSlide({ target: value, dir: Math.sign(compare(value, shown)) || 1, running: false })
  }, [value, shown, slide, dragX, compare])

  // Laid out at rest first, then set off (the transition needs a start).
  useLayoutEffect(() => {
    if (!slide || slide.running) return undefined
    const frame = requestAnimationFrame(() => setSlide((current) => (current === slide ? { ...current, running: true } : current)))
    return () => cancelAnimationFrame(frame)
  }, [slide])

  // Over: the target is the page (a transform left unchanged never ends).
  useEffect(() => {
    if (!slide?.running) return undefined
    const timer = window.setTimeout(() => {
      setShown(slide.target)
      setSlide(null)
    }, 360)
    return () => window.clearTimeout(timer)
  }, [slide])

  const handlePointerDown = (event) => {
    // A new gesture: the click a past swipe was keeping from landing would
    // have come by now (touch browsers often send none after a drag), so
    // this tap goes through.
    suppressClickRef.current = false
    if (event.pointerType === 'mouse' || slide) return
    gestureRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, at: event.timeStamp, speed: 0, horizontal: false }
  }

  const handlePointerMove = (event) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.id !== event.pointerId) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (!gesture.horizontal) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        gestureRef.current = null
        return
      }
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy) * 1.2) return
      gesture.horizontal = true
      try {
        containerRef.current?.setPointerCapture?.(event.pointerId)
      } catch {
        // A pointer the browser no longer tracks: the drag goes on uncaptured.
      }
    }
    const elapsed = Math.max(1, event.timeStamp - gesture.at)
    gesture.speed = (dx - gesture.dx) / elapsed
    gesture.dx = dx
    gesture.at = event.timeStamp
    setDragX(dx)
  }

  const handlePointerEnd = () => {
    const gesture = gestureRef.current
    gestureRef.current = null
    if (!gesture?.horizontal) return
    suppressClickRef.current = true
    const width = containerRef.current?.clientWidth ?? 1
    const flicked = Math.abs(gesture.speed) > LANDING_SPEED && Math.sign(gesture.speed) === Math.sign(gesture.dx)
    setDragX(null)
    if (Math.abs(gesture.dx) > width / 2 || flicked) {
      const dir = gesture.dx < 0 ? 1 : -1
      const target = step(shown, dir)
      setSlide({ target, dir, running: true })
      onSwipe(target)
    } else {
      setSlide({ target: shown, dir: 0, running: true })
    }
  }

  const previous = slide?.dir < 0 ? slide.target : step(shown, -1)
  const next = slide?.dir > 0 ? slide.target : step(shown, 1)
  let transform = 'translateX(-100%)'
  let transition = 'none'
  if (dragX !== null) {
    transform = `translateX(calc(-100% + ${dragX}px))`
  } else if (slide?.running) {
    transform = `translateX(${slide.dir > 0 ? '-200%' : slide.dir < 0 ? '0%' : '-100%'})`
    transition = SLIDE
  }

  return (
    <div
      ref={containerRef}
      className={`swipe-pager ${className}`}
      role="group"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return
        suppressClickRef.current = false
        event.stopPropagation()
        event.preventDefault()
      }}
    >
      <div className="swipe-pager-track" style={{ transform, transition }}>
        {[previous, shown, next].map((page, index) => (
          <div key={page} className="swipe-pager-page" aria-hidden={index !== 1 || undefined} inert={index !== 1 || undefined}>
            {renderPage(page, index === 1)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SwipePager
