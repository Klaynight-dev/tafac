import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import universityConfig from '@university'
import { ENT_AUTH_PREFIX, getAdeTeachers } from '../entApi'
import { APP_NAME } from '../seo'
import { buildResourceIdsFromSelection, fetchUpcomingEvents, formatDateOnly } from '../upcomingClasses'
import { AppPage, INLINE_BUTTON, PRIMARY_BUTTON, PageButton, StatCard, StatRow } from './AppPage'
import { GradesNotice } from './GradesNotice'
import { LoadingDots, SegmentedControl, StatusMessage } from './ScodocUi'
import {
  addDays,
  capitalize,
  downloadIcsCalendar,
  findCommonFreeSlots,
  formatWeekLabel,
  startOfWeek,
} from '../planningUtils'
import { getOfflineCache, setOfflineCache } from '../offlineStorage'

import PlanningWeekGrid from './planning/PlanningWeekGrid'
import PlanningDayView from './planning/PlanningDayView'
import PlanningListView from './planning/PlanningListView'
import PlanningMonthView from './planning/PlanningMonthView'
import TeacherCompareModal from './planning/TeacherCompareModal'
import CourseDetailModal from './planning/CourseDetailModal'
import FreeRoomsModal from './planning/FreeRoomsModal'
import PageGuidedTour from './PageGuidedTour'
import WidgetNextClass from './WidgetNextClass'

const PLANNING_SERVICE_URL = universityConfig.planning?.serviceUrl ?? null
const ADE_HREF = PLANNING_SERVICE_URL
  ? `${ENT_AUTH_PREFIX}/launch?url=${encodeURIComponent(PLANNING_SERVICE_URL)}`
  : null


const PLANNING_TOUR_STEPS = [
  {
    id: 'intro',
    title: 'Bienvenue sur ton planning',
    body: 'Retrouve tous tes cours du BUT, organise ta semaine et vérifie tes salles et horaires en un coup d’œil.',
    icon: 'carbon:calendar',
  },
  {
    id: 'views',
    target: 'planning-views',
    title: '4 vues sur-mesure',
    body: 'Semaine (grille classique), Jour (timeline par heure), Liste (toutes tes cartes) et Mois (vue d’ensemble). Sur mobile, swipe horizontalement pour naviguer entre les jours ou les semaines !',
    icon: 'carbon:grid',
  },
  {
    id: 'nav',
    target: 'planning-nav',
    title: 'Navigation temporelle',
    body: 'Avance ou recule d’une période avec les flèches, et clique sur « Aujourd’hui » pour revenir instantanément au moment présent.',
    icon: 'carbon:time',
  },
  {
    id: 'teacher',
    target: 'planning-teacher',
    title: 'Comparaison avec les professeurs',
    body: 'Recherche un enseignant pour afficher son emploi du temps à côté du tien, repérer automatiquement les créneaux libres en commun et préparer une demande de déplacement de cours.',
    icon: 'carbon:collaborate',
  },
  {
    id: 'content',
    target: 'planning-content',
    title: 'Fiche détaillée de chaque cours',
    body: 'Chaque carte reproduit fidèlement le style Tafac. Clique sur un cours pour ouvrir sa fiche complète (salle, enseignant, promo et durée).',
    icon: 'carbon:information',
  },
]

const VIEW_STORAGE_KEY = 'l-ent:planning-view-mode'

// Previous / next period: a round white button.
const NAV_BUTTON = 'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border bg-widget-bg text-text cursor-pointer transition-colors duration-150 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export default function PlanningPage({ selection = null, sessionUser = null, onOpenAccount }) {
  const resourceIds = useMemo(() => buildResourceIdsFromSelection(selection), [selection])
  const scope = `${sessionUser ?? ''}::${resourceIds.join('|')}`

  // View mode: 'week' (grid) | 'day' | 'list' | 'month'
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem(VIEW_STORAGE_KEY)
      if (['week', 'day', 'list', 'month'].includes(saved)) return saved
    } catch {
      // Best effort: nothing to do when it fails.
    }
    // A phone is too narrow for five columns: one day at a time.
    return window.matchMedia?.('(max-width: 639.98px)').matches ? 'day' : 'week'
  })

  // Date states
  const [monday, setMonday] = useState(() => startOfWeek(new Date()))
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [currentMonth, setCurrentMonth] = useState(() => new Date())

  // Student schedule state
  const [state, setState] = useState({ status: 'loading', events: [], complete: true })
  const [reloadToken, setReloadToken] = useState(0)

  // Teacher comparison state
  const [selectedTeacher, setSelectedTeacher] = useState(null)
  const [teacherState, setTeacherState] = useState({ status: 'idle', events: [] })
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [isFreeRoomsModalOpen, setIsFreeRoomsModalOpen] = useState(false)

  // Course detail modal state
  const [selectedEventForDetail, setSelectedEventForDetail] = useState(null)
  const [tourTrigger, setTourTrigger] = useState(0)
  // Shown after « Aujourd’hui » landed on another day: { date, reason }.
  const [jumpNotice, setJumpNotice] = useState(null)

  // Cache for fetched periods
  const eventsCache = useRef(new Map())
  const mondayKey = formatDateOnly(monday)
  const now = new Date()

  // Save view preference
  const handleChangeView = (newView) => {
    setViewMode(newView)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, newView)
    } catch {
      // Best effort: nothing to do when it fails.
    }
  }

  // Set document title
  useEffect(() => {
    const previousTitle = document.title
    document.title = `Planning · ${APP_NAME}`
    return () => { document.title = previousTitle }
  }, [])


  // Determine query parameters based on view mode
  const fetchParams = useMemo(() => {
    if (viewMode === 'month') {
      const year = currentMonth.getFullYear()
      const month = currentMonth.getMonth()
      const firstOfMonth = new Date(year, month, 1)
      const startDate = formatDateOnly(startOfWeek(firstOfMonth))
      return { startDate, lookaheadDays: 42 }
    }
    return { startDate: mondayKey, lookaheadDays: 7 }
  }, [viewMode, currentMonth, mondayKey])

  // Fetch student timetable
  useEffect(() => {
    if (!resourceIds.length) {
      return undefined
    }

    const cacheKey = `${scope}::${fetchParams.startDate}::${fetchParams.lookaheadDays}d`
    const cached = eventsCache.current.get(cacheKey)
    if (cached) {
      setState({ status: 'ok', ...cached })
      return undefined
    }

    const controller = new AbortController()
    setState((current) => ({ ...current, status: 'loading' }))

    fetchUpcomingEvents({
      selection,
      signal: controller.signal,
      startDate: fetchParams.startDate,
      lookaheadDays: fetchParams.lookaheadDays,
    })
      .then((result) => {
        eventsCache.current.set(cacheKey, result)
        void setOfflineCache(`planning:${cacheKey}`, result)
        setState({ status: 'ok', ...result })
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          getOfflineCache(`planning:${cacheKey}`).then((offline) => {
            if (offline?.data) {
              setState({ status: 'ok', ...offline.data, fromCache: true })
            } else {
              setState({ status: 'error', events: [], complete: true })
            }
          })
        }
      })

    return () => controller.abort()
  }, [fetchParams, reloadToken, resourceIds, scope, selection])

  // Fetch teacher timetable when a teacher is selected
  useEffect(() => {
    if (!selectedTeacher) {
      setTeacherState({ status: 'idle', events: [] })
      return undefined
    }

    const teacherResourceId = selectedTeacher.id
    if (!teacherResourceId) {
      setTeacherState({ status: 'ok', events: [] })
      return undefined
    }

    const cacheKey = `teacher::${teacherResourceId}::${fetchParams.startDate}::${fetchParams.lookaheadDays}d`
    const cached = eventsCache.current.get(cacheKey)
    if (cached) {
      setTeacherState({ status: 'ok', events: cached.events || [] })
      return undefined
    }

    const controller = new AbortController()
    setTeacherState({ status: 'loading', events: [] })

    fetchUpcomingEvents({
      selection: { resourceId: teacherResourceId },
      signal: controller.signal,
      startDate: fetchParams.startDate,
      lookaheadDays: fetchParams.lookaheadDays,
    })
      .then((result) => {
        eventsCache.current.set(cacheKey, result)
        setTeacherState({ status: 'ok', events: result.events || [] })
      })
      .catch((error) => {
        if (error?.name !== 'AbortError') {
          setTeacherState({ status: 'error', events: [] })
        }
      })

    return () => controller.abort()
  }, [selectedTeacher, fetchParams])

  // Selection handler for teacher (resolves ID if needed)
  const handleSelectTeacher = useCallback(async (teacher) => {
    if (!teacher) {
      setSelectedTeacher(null)
      return
    }

    let resolved = { ...teacher }
    if (!resolved.id && resolved.name) {
      try {
        const res = await getAdeTeachers(resolved.name)
        const match = res?.teachers?.find((t) => t.name.toLowerCase() === resolved.name.toLowerCase())
        if (match?.id) {
          resolved = match
        }
      } catch {
        // Best effort: nothing to do when it fails.
      }
    }

    setSelectedTeacher(resolved)
  }, [])

  // Retry loading
  const retry = useCallback(() => {
    eventsCache.current.clear()
    setReloadToken((token) => token + 1)
  }, [])

  // Common free slots calculation
  const commonSlots = useMemo(() => {
    if (!selectedTeacher || !teacherState.events.length) return []
    return findCommonFreeSlots({
      studentEvents: state.events,
      teacherEvents: teacherState.events,
      monday,
    })
  }, [selectedTeacher, state.events, teacherState.events, monday])

  // Navigation handlers
  const isCurrentWeek = mondayKey === formatDateOnly(startOfWeek(new Date()))
  const isToday = formatDateOnly(currentDate) === formatDateOnly(new Date())
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()

  const handlePrev = () => {
    setJumpNotice(null)
    if (viewMode === 'day') {
      setCurrentDate((curr) => {
        const day = curr.getDay() // 0 = Dimanche, 1 = Lundi, 6 = Samedi
        let step = -1
        if (day === 1) step = -3 // Lundi -> Vendredi
        else if (day === 0) step = -2 // Dimanche -> Vendredi
        else if (day === 6) step = -1 // Samedi -> Vendredi
        const prev = addDays(curr, step)
        setMonday(startOfWeek(prev))
        return prev
      })
    } else if (viewMode === 'month') {
      setCurrentMonth((curr) => new Date(curr.getFullYear(), curr.getMonth() - 1, 1))
    } else {
      setMonday((curr) => {
        const prev = addDays(curr, -7)
        setCurrentDate(prev)
        return prev
      })
    }
  }

  const handleNext = () => {
    setJumpNotice(null)
    if (viewMode === 'day') {
      setCurrentDate((curr) => {
        const day = curr.getDay() // 0 = Dimanche, 5 = Vendredi, 6 = Samedi
        let step = 1
        if (day === 5) step = 3 // Vendredi -> Lundi
        else if (day === 6) step = 2 // Samedi -> Lundi
        else if (day === 0) step = 1 // Dimanche -> Lundi
        const next = addDays(curr, step)
        setMonday(startOfWeek(next))
        return next
      })
    } else if (viewMode === 'month') {
      setCurrentMonth((curr) => new Date(curr.getFullYear(), curr.getMonth() + 1, 1))
    } else {
      setMonday((curr) => {
        const next = addDays(curr, 7)
        setCurrentDate(next)
        return next
      })
    }
  }

  // Today, or, without a course today (weekend, holidays), the next day with
  // one (ADE, six weeks ahead), with a word on why. In the week view, the
  // week of that day; in the month view, the month stays.
  const showToday = useCallback(async () => {
    const today = new Date()
    setCurrentDate(today)
    setMonday(startOfWeek(today))
    setCurrentMonth(today)
    setJumpNotice(null)
    if (!resourceIds.length) return

    let next = null
    try {
      const result = await fetchUpcomingEvents({ selection, startDate: formatDateOnly(today), lookaheadDays: 42 })
      const todayKey = formatDateOnly(today)
      next = result.events
        .map((event) => new Date(event.start))
        .filter((start) => formatDateOnly(start) >= todayKey)
        .sort((left, right) => left - right)[0] ?? null
    } catch {
      return
    }
    if (!next || formatDateOnly(next) === formatDateOnly(today)) return

    setCurrentDate(next)
    setMonday(startOfWeek(next))
    const day = today.getDay()
    const gapDays = Math.round((startOfDay(next) - startOfDay(today)) / 86_400_000)
    setJumpNotice({
      date: next,
      reason: gapDays > 4 ? 'holidays' : day === 0 || day === 6 ? 'weekend' : 'today',
    })
  }, [resourceIds.length, selection])

  // On arrival, like « Aujourd’hui ».
  const arrivedRef = useRef(false)
  useEffect(() => {
    if (arrivedRef.current || !resourceIds.length) return
    arrivedRef.current = true
    void showToday()
  }, [resourceIds.length, showToday])

  const handleToday = () => {
    void showToday()
  }

  const isAtCurrentPeriod = viewMode === 'day' ? isToday : viewMode === 'month' ? isCurrentMonth : isCurrentWeek

  const touchStartRef = useRef(null)

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    }
  }

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || !e.changedTouches || e.changedTouches.length !== 1) return
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const elapsed = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && elapsed < 600) {
      if (deltaX < 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isCompareModalOpen || selectedEventForDetail) return
      const activeTag = document.activeElement?.tagName?.toLowerCase()
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleNext, handlePrev, isCompareModalOpen, selectedEventForDetail])

  // Subtitle label
  const subtitleLabel = useMemo(() => {
    if (viewMode === 'day') {
      return capitalize(currentDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
    }
    if (viewMode === 'month') {
      return capitalize(currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
    }
    return formatWeekLabel(monday)
  }, [viewMode, currentDate, currentMonth, monday])

  // View switcher options
  const viewOptions = [
    { value: 'week', label: 'Semaine' },
    { value: 'day', label: 'Jour' },
    { value: 'list', label: 'Liste' },
    { value: 'month', label: 'Mois' },
  ]

  const jumpDayLabel = jumpNotice
    ? jumpNotice.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : ''
  const jumpTitle = jumpNotice
    ? {
        weekend: `C’est le week-end : reprise ${jumpDayLabel}`,
        holidays: `Pas de cours d’ici là : reprise ${jumpDayLabel}`,
        today: `Pas de cours aujourd’hui : prochain cours ${jumpDayLabel}`,
      }[jumpNotice.reason]
    : null

  let mainBody
  if (!resourceIds.length) {
    mainBody = (
      <StatusMessage
        icon="carbon:user-multiple"
        title="Groupe manquant"
        detail="Choisis ton groupe TD ou TP dans « Mon compte » pour voir ton planning."
        action={onOpenAccount ? (
          <button type="button" onClick={onOpenAccount} className={PRIMARY_BUTTON}>
            Ouvrir Mon compte
          </button>
        ) : null}
      />
    )
  } else if (state.status === 'error') {
    mainBody = (
      <StatusMessage
        icon="carbon:cloud-offline"
        title="Planning indisponible"
        detail="ADE ne répond pas pour le moment. Réessaie dans quelques minutes, ou ouvre-le directement."
        action={(
          <>
            <button type="button" onClick={retry} className={PRIMARY_BUTTON}>Réessayer</button>
            {ADE_HREF ? <PageButton icon="carbon:arrow-up-right" label="Ouvrir ADE" href={ADE_HREF} className="max-md:size-auto max-md:px-3.5 max-md:py-2 [&>span]:max-md:inline" /> : null}
          </>
        )}
      />
    )
  } else if (state.status === 'loading' && !state.events.length) {
    mainBody = <LoadingDots label="Chargement de ton planning…" />
  } else if (viewMode === 'week') {
    mainBody = (
      <PlanningWeekGrid
        events={state.events}
        teacherEvents={teacherState.events}
        selectedTeacher={selectedTeacher}
        commonSlots={commonSlots}
        monday={monday}
        now={now}
        onSelectSlot={() => setIsCompareModalOpen(true)}
        onEventClick={(ev) => setSelectedEventForDetail(ev)}
      />
    )
  } else if (viewMode === 'day') {
    mainBody = (
      <PlanningDayView
        events={state.events}
        teacherEvents={teacherState.events}
        selectedTeacher={selectedTeacher}
        commonSlots={commonSlots}
        currentDate={currentDate}
        monday={monday}
        now={now}
        onSelectDate={(d) => {
          setJumpNotice(null)
          setCurrentDate(d)
          setMonday(startOfWeek(d))
        }}
        onSelectSlot={() => setIsCompareModalOpen(true)}
        onEventClick={(ev) => setSelectedEventForDetail(ev)}
      />
    )
  } else if (viewMode === 'month') {
    mainBody = (
      <PlanningMonthView
        events={state.events}
        currentMonth={currentMonth}
        now={now}
        onSelectMonth={setCurrentMonth}
        onSelectDate={(d) => {
          setJumpNotice(null)
          setCurrentDate(d)
          setMonday(startOfWeek(d))
          setViewMode('day')
        }}
      />
    )
  } else {
    mainBody = (
      <PlanningListView
        events={state.events}
        monday={monday}
        now={now}
        onEventClick={(ev) => setSelectedEventForDetail(ev)}
      />
    )
  }

  // The band: the view and the period, then what's worth a word (the day
  // shown instead of today, the teacher being compared).
  // At a glance, like the home page: the next course (its own widget), then
  // today's courses and the week shown, from the loaded timetable.
  const glance = useMemo(() => {
    const weekStart = monday.getTime()
    const weekEnd = addDays(monday, 7).getTime()
    const todayKey = formatDateOnly(new Date())
    const minutes = (event) => Math.max(0, (new Date(event.end) - new Date(event.start)) / 60000)
    const week = state.events.filter((event) => {
      const start = new Date(event.start).getTime()
      return start >= weekStart && start < weekEnd
    })
    const today = state.events
      .filter((event) => formatDateOnly(new Date(event.start)) === todayKey)
      .sort((left, right) => new Date(left.end) - new Date(right.end))
    const weekMinutes = Math.round(week.reduce((sum, event) => sum + minutes(event), 0))
    return {
      weekCount: week.length,
      weekHours: `${Math.floor(weekMinutes / 60)}h${weekMinutes % 60 ? String(weekMinutes % 60).padStart(2, '0') : ''}`,
      todayCount: today.length,
      todayEnd: today.length ? new Date(today[today.length - 1].end).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h') : null,
    }
  }, [monday, state.events])

  const overview = resourceIds.length ? (
    <div className="grid gap-4 max-md:gap-3">
      {viewMode !== 'month' && state.status === 'ok' ? (
        <StatRow>
          <WidgetNextClass visible selection={selection} sessionUser={sessionUser} />
          {glance.todayCount ? (
            <StatCard label="Aujourd’hui" icon="carbon:calendar" value={glance.todayCount} unit="cours" detail={`Fin de journée à ${glance.todayEnd}`} />
          ) : null}
          <StatCard
            label={isCurrentWeek ? 'Cette semaine' : `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
            icon="carbon:time"
            value={glance.weekCount ? glance.weekHours : '0h'}
            detail={glance.weekCount ? `${glance.weekCount} cours` : 'Pas de cours'}
          />
        </StatRow>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <div data-tour="planning-views" className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <SegmentedControl label="Vue du planning" options={viewOptions} value={viewMode} onChange={handleChangeView} />
        </div>
        <div data-tour="planning-nav" className="flex items-center gap-1.5 max-md:ml-auto">
          <button type="button" aria-label="Période précédente" onClick={handlePrev} className={NAV_BUTTON}>
            <Icon icon="carbon:chevron-left" className="size-4" aria-hidden="true" />
          </button>
          <button type="button" disabled={isAtCurrentPeriod && !jumpNotice} onClick={handleToday} className={INLINE_BUTTON}>
            Aujourd’hui
          </button>
          <button type="button" aria-label="Période suivante" onClick={handleNext} className={NAV_BUTTON}>
            <Icon icon="carbon:chevron-right" className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {jumpTitle ? (
        <GradesNotice icon="carbon:calendar" label="Jour affiché" title={jumpTitle} onDismiss={() => setJumpNotice(null)} />
      ) : null}
      {selectedTeacher ? (
        <GradesNotice
          icon="carbon:collaborate"
          label="Comparaison avec un enseignant"
          title={`Comparaison avec ${selectedTeacher.name}`}
          badge={commonSlots.length ? `${commonSlots.length} créneau${commonSlots.length > 1 ? 'x' : ''} commun${commonSlots.length > 1 ? 's' : ''}` : null}
          onDismiss={() => handleSelectTeacher(null)}
        >
          {commonSlots.length
            ? 'Ses cours s’affichent à côté des tiens ; les créneaux libres pour vous deux sont surlignés.'
            : 'Aucun créneau libre en commun repéré cette semaine.'}
        </GradesNotice>
      ) : null}
      {state.fromCache ? (
        <GradesNotice icon="carbon:cloud-offline" label="Hors ligne" title="Hors ligne : dernier planning enregistré" />
      ) : null}
    </div>
  ) : null

  return (
    <AppPage
      titleId="planning-page-title"
      title="Planning"
      controls={resourceIds.length ? (
        <span className="font-body text-[15px] font-semibold leading-none text-text-secondary max-md:hidden" aria-live="polite">{subtitleLabel}</span>
      ) : null}
      actions={(
        <>
          <PageButton icon="carbon:workspace" label="Salles libres" onClick={() => setIsFreeRoomsModalOpen(true)} />
          <PageButton
            data-tour="planning-teacher"
            icon="carbon:collaborate"
            label={selectedTeacher ? 'Comparaison' : 'Profs'}
            onClick={() => setIsCompareModalOpen(true)}
            accent={Boolean(selectedTeacher)}
          />
          <PageButton
            icon="carbon:calendar-add"
            label="Exporter"
            onClick={() => downloadIcsCalendar(state.events, 'planning-tafac.ics')}
            disabled={!state.events.length}
            title="Exporter au format .ics (Google Agenda, Apple Calendrier, Outlook)"
          />
          {ADE_HREF ? <PageButton icon="carbon:arrow-up-right" label="ADE" href={ADE_HREF} /> : null}
          <PageButton icon="carbon:help" label="Aide" onClick={() => setTourTrigger((c) => c + 1)} className="max-xl:[&>span]:hidden max-xl:px-2.5" />
        </>
      )}
      subtitle={resourceIds.length ? <span className="md:hidden">{subtitleLabel}</span> : null}
      overview={overview}
    >
      {/* The calendar itself; swipe sideways on a phone for the next or
          previous period. */}
      <div data-tour="planning-content" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="w-full min-w-0 touch-pan-y">
        {mainBody}
      </div>

      {/* Course detail modal (opened when clicking on a course) */}
      <CourseDetailModal
        event={selectedEventForDetail}
        onClose={() => setSelectedEventForDetail(null)}
        onCompareTeacher={(teacher) => {
          handleSelectTeacher(teacher)
          setIsCompareModalOpen(true)
        }}
      />

      {/* Teacher compare & reschedule modal */}
      <TeacherCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        studentEvents={state.events}
        teacherEvents={teacherState.events}
        selectedTeacher={selectedTeacher}
        onSelectTeacher={handleSelectTeacher}
        monday={monday}
        loadingTeacher={teacherState.status === 'loading'}
        studentSelection={selection}
      />

      <FreeRoomsModal
        isOpen={isFreeRoomsModalOpen}
        onClose={() => setIsFreeRoomsModalOpen(false)}
        events={state.events}
      />

      <PageGuidedTour
        storageKey="l-ent:tour:planning"
        steps={PLANNING_TOUR_STEPS}
        manualTrigger={tourTrigger}
      />
    </AppPage>
  )
}
