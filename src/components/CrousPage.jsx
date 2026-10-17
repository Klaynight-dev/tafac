import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { CROUS_MEAL_PRICE, fetchCrous, getStoredCrousRestaurant, pickMenuDay, sectionIcon, setStoredCrousRestaurant, todayKey } from '../crousApi'
import { APP_NAME } from '../seo'
import { AppPage, PAGE_CARD, PageButton, PageSection, StatCard, StatRow } from './AppPage'
import Dropdown from './Dropdown'
import { GradesNotice } from './GradesNotice'
import LoadingDots from './LoadingDots'
import { SegmentedControl, StatusMessage } from './ScodocUi'

// « Menu du RU »: the CROUS's menus for the coming days, in the frame of
// « Mes notes ». The restaurant is picked next to the title and remembered
// (by default the establishment's). Today's menu first; without a service
// today (weekend, holidays), the next day with a menu, said as such.

function formatDay(date, { long = false } = {}) {
  const day = new Date(`${date}T12:00:00`)
  const label = day.toLocaleDateString('fr-FR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '')
}

function dayChipLabel(date) {
  return date === todayKey() ? 'Aujourd’hui' : formatDay(date)
}

function hasMenu(day) {
  return Boolean(day?.meals.some((meal) => meal.sections.length))
}

function MenuSection({ section }) {
  return (
    <article className={`${PAGE_CARD} flex flex-col gap-3 p-4 max-md:p-3.5`}>
      <h3 className="m-0 flex items-center gap-2 font-body text-[15px] font-semibold text-text">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-muted-fill" aria-hidden="true">
          <Icon icon={sectionIcon(section.title)} className="size-4" />
        </span>
        {section.title}
      </h3>
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {section.items.map((item, index) => (
          <li key={`${item}-${index}`} className="font-body text-[15px] font-medium leading-snug text-text-secondary">{item}</li>
        ))}
      </ul>
    </article>
  )
}

function CrousPage({ establishment = null }) {
  const [restaurantId, setRestaurantId] = useState(() => getStoredCrousRestaurant(establishment))
  const [state, setState] = useState({ status: 'loading', data: null })
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Menu du RU · ${APP_NAME}`
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    let cancelled = false
    setState((current) => ({ status: 'loading', data: current.data }))
    fetchCrous(restaurantId)
      .then((data) => { if (!cancelled) setState({ status: 'ok', data }) })
      .catch(() => { if (!cancelled) setState({ status: 'error', data: null }) })
    return () => { cancelled = true }
  }, [restaurantId])

  const data = state.data
  const restaurant = data?.restaurants.find((resto) => resto.id === restaurantId) ?? null
  const days = useMemo(() => (data?.days ?? []).filter((day) => day.date >= todayKey()), [data])
  const firstPick = useMemo(() => pickMenuDay(days), [days])
  const day = days.find((entry) => entry.date === selectedDate) ?? firstPick.day

  const handleRestaurantChange = (id) => {
    setRestaurantId(id)
    setStoredCrousRestaurant(id)
    setSelectedDate(null)
  }

  const restaurantOptions = useMemo(() => (data?.restaurants ?? [])
    .slice()
    .sort((left, right) => (left.zone ?? '').localeCompare(right.zone ?? '', 'fr') || left.title.localeCompare(right.title, 'fr'))
    .map((resto) => ({ value: resto.id, label: resto.zone ? `${resto.title} · ${resto.zone}` : resto.title })), [data])

  let body
  if (state.status === 'loading' && !data) {
    body = <LoadingDots label="Chargement du menu" className="justify-self-start py-2 text-text-muted" />
  } else if (state.status === 'error') {
    body = (
      <StatusMessage
        icon="carbon:cloud-offline"
        title="Menu indisponible"
        detail="Le CROUS ne répond pas pour le moment. Réessaie dans quelques minutes."
      />
    )
  } else if (!restaurant) {
    body = <StatusMessage icon="carbon:restaurant" title="Choisis ton restaurant" detail="Sélectionne ton RU à côté du titre pour voir son menu." />
  } else if (!day) {
    body = (
      <StatusMessage
        icon="carbon:calendar"
        title="Pas de menu publié"
        detail={`${restaurant.title} n’a pas encore publié de menu pour les jours qui viennent.`}
      />
    )
  } else if (!hasMenu(day)) {
    const notice = day.meals.map((meal) => meal.notice).filter(Boolean).join(' ')
    body = <StatusMessage icon="carbon:locked" title="Pas de service ce jour-là" detail={notice || 'Le restaurant est fermé ce jour-là.'} />
  } else {
    body = (
      <div key={`${restaurantId}-${day.date}`} className="semester-fade grid gap-8 max-md:gap-6">
        {day.meals.filter((meal) => meal.sections.length).map((meal) => (
          <PageSection
            key={meal.name}
            id={`crous-meal-${meal.name}`}
            icon={/soir/i.test(meal.name) ? 'carbon:moon' : 'carbon:sun'}
            title={meal.name.charAt(0).toUpperCase() + meal.name.slice(1)}
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 max-md:grid-cols-1">
              {meal.sections.map((section) => <MenuSection key={section.title} section={section} />)}
            </div>
          </PageSection>
        ))}
      </div>
    )
  }

  const dayOptions = days.filter((entry) => hasMenu(entry) || entry.date === todayKey()).slice(0, 7)
  const showsAnotherDay = hasMenu(day) && !selectedDate && !firstPick.isToday && day.date !== todayKey()

  const overview = restaurant ? (
    <div className="grid gap-4 max-md:gap-3">
      <StatRow>
        {CROUS_MEAL_PRICE ? <StatCard label="Repas étudiant" icon="carbon:wallet" value={CROUS_MEAL_PRICE} detail="Pour tous les étudiants" /> : null}
        {restaurant.hours ? <StatCard label="Horaires" icon="carbon:time" value={restaurant.hours.split(',')[0].replace(/^\s*midi\s*:\s*/i, '')} detail={restaurant.hours.split(',').slice(1).join(',').trim() || null} className="[&_.font-display]:text-[26px]" /> : null}
      </StatRow>
      {restaurant.closed ? (
        <GradesNotice icon="carbon:locked" label="Restaurant fermé" title="Restaurant fermé pour le moment">
          Le CROUS indique que ce restaurant est fermé : vérifie un autre RU proche.
        </GradesNotice>
      ) : null}
      {showsAnotherDay ? (
        <GradesNotice icon="carbon:calendar" label="Jour affiché" title={`Pas de service aujourd’hui : voici le menu de ${formatDay(day.date, { long: true }).toLowerCase()}`} />
      ) : null}
      {dayOptions.length > 1 ? (
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <SegmentedControl
            label="Jour"
            options={dayOptions.map((entry) => ({ value: entry.date, label: dayChipLabel(entry.date) }))}
            value={day?.date}
            onChange={setSelectedDate}
          />
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <AppPage
      titleId="crous-page-title"
      title="Menu du RU"
      controls={restaurantOptions.length ? (
        <span className="inline-flex max-md:min-w-0 max-md:max-w-full">
          <Dropdown
            label="Restaurant"
            options={restaurantOptions}
            value={restaurantId}
            onChange={handleRestaurantChange}
            placeholder="Choisir un RU"
            triggerLabel={restaurant ? restaurant.title : null}
            triggerClassName="inline-flex items-center gap-1 border-0 bg-transparent p-0 font-body text-[15px] font-semibold leading-none text-text-secondary cursor-pointer transition-colors duration-150 hover:text-text focus-visible:text-text focus-visible:outline-none focus-visible:underline underline-offset-4 max-md:min-h-10 max-md:max-w-full max-md:truncate max-md:rounded-full max-md:border max-md:border-border max-md:bg-widget-bg max-md:px-3.5 max-md:text-text max-md:shadow-xs"
          />
        </span>
      ) : null}
      actions={restaurant?.lat != null ? (
        <PageButton
          icon="carbon:map"
          label="Itinéraire"
          href={`https://www.openstreetmap.org/directions?to=${restaurant.lat},${restaurant.lon}`}
        />
      ) : null}
      overview={overview}
      footer={data?.offline ? 'Hors ligne : dernier menu enregistré' : data ? 'Menus publiés par le CROUS, sous réserve de modification' : null}
    >
      {body}
    </AppPage>
  )
}

export default CrousPage
