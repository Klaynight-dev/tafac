import { useEffect, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { CROUS_MEAL_PRICE, describeClosures, fetchCrous, getStoredCrousRestaurant, hasMenu, pickMenuDay, readOpeningHours, sectionIcon, setStoredCrousRestaurant, todayKey } from '../crousApi'
import { accentStyle } from '../eventAccents'
import { APP_NAME } from '../seo'
import { AppPage, INLINE_BUTTON, PageButton, PageSection, StatCard, StatRow } from './AppPage'
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

// A section's colour (eventAccents), as a UE's on Mes notes: green for the
// starters, orange for the mains, pink for the desserts.
function sectionAccent(title) {
  const text = String(title ?? '').toLowerCase()
  if (/entr|hors/.test(text)) return 6
  if (/dessert|fromage/.test(text)) return 7
  if (/pizza|grill|snack|sandwich|burger/.test(text)) return 1
  if (/accomp|légume|legume|féculent|feculent/.test(text)) return 4
  if (/plat/.test(text)) return 8
  return 0
}

// "Tartine aux légumes VG": the dish, and a « Végé » badge.
function readDish(item) {
  const match = String(item).match(/^(.*?)\s+(?:VG|végé|vegan|végétarien)\.?\s*$/i)
  return match ? { name: match[1], veggie: true } : { name: item, veggie: false }
}

// One section of a meal, carded as Mes notes' groups: its colour washing
// the top, its icon on a disc of that colour, its count, then its dishes as
// rows, each with its colour's dot.
function MenuSection({ section }) {
  return (
    <article
      className="widget-card widget-card-visible relative isolate flex min-w-0 flex-col gap-1 overflow-hidden rounded-[22px] border border-white bg-widget-bg p-2 text-text shadow-md dark:border-border max-md:rounded-[20px]"
      style={accentStyle(sectionAccent(section.title))}
    >
      <span className="latest-grade-wash planning-accent-fill" aria-hidden="true" />
      <h3 className="m-0 flex items-center gap-2.5 px-2 pt-2 pb-1.5 font-body text-[16px] font-semibold leading-tight text-text">
        <span className="planning-accent-fill inline-flex size-9 shrink-0 items-center justify-center rounded-full text-white" aria-hidden="true">
          <Icon icon={sectionIcon(section.title)} className="size-[18px]" />
        </span>
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{section.title}</span>
        <span className="shrink-0 rounded-full border border-border bg-bg-subtle px-2 py-1 font-body text-[12px] font-semibold leading-none text-text-muted">{section.items.length}</span>
      </h3>
      <ul className="m-0 grid list-none gap-0.5 p-0">
        {section.items.map((item, index) => {
          const dish = readDish(item)
          return (
            <li key={`${item}-${index}`} className="flex min-w-0 items-center gap-2.5 rounded-[14px] px-3 py-2 font-body text-[15px] font-medium leading-snug text-text">
              <span className="planning-accent-fill size-1.5 shrink-0 rounded-full" aria-hidden="true" />
              <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{dish.name}</span>
              {dish.veggie ? <span className="shrink-0 rounded-full bg-[#e3f5e1] px-[7px] py-[3px] text-[11px] font-semibold leading-none text-[#2f7a2b] dark:bg-[#183a17] dark:text-[#8fd88a]">Végé</span> : null}
            </li>
          )
        })}
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
    // The RU puts no menu online (many don't): say so, and point to the RUs
    // that do, those of its town first.
    const others = (data?.restaurants ?? [])
      .filter((resto) => resto.hasMenu && resto.id !== restaurantId)
      .sort((left, right) => Number(right.zone === restaurant.zone) - Number(left.zone === restaurant.zone))
      .slice(0, 3)
    body = (
      <StatusMessage
        icon="carbon:document-unknown"
        title="Menu pas encore publié"
        detail={`${restaurant.title} n’a pas mis son menu en ligne pour les prochains jours. Le CROUS le publie souvent la veille, parfois pas du tout.`}
        action={others.length ? others.map((resto) => (
          <button key={resto.id} type="button" onClick={() => handleRestaurantChange(resto.id)} className={INLINE_BUTTON}>
            <Icon icon="carbon:restaurant" className="size-3.5" aria-hidden="true" />
            Voir {resto.title}{resto.zone && resto.zone !== restaurant.zone ? ` · ${resto.zone}` : ''}
          </button>
        )) : null}
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
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3 max-md:grid-cols-1 max-md:gap-2">
              {meal.sections.map((section) => <MenuSection key={section.title} section={section} />)}
            </div>
          </PageSection>
        ))}
      </div>
    )
  }

  const dayOptions = days.filter((entry) => hasMenu(entry)).slice(0, 7)
  const closures = useMemo(() => describeClosures(days), [days])
  const openingHours = readOpeningHours(restaurant?.hours)
  const showsAnotherDay = hasMenu(day) && !selectedDate && !firstPick.isToday && day.date !== todayKey()

  const overview = restaurant ? (
    <div className="grid gap-4 max-md:gap-3">
      <StatRow>
        {CROUS_MEAL_PRICE ? <StatCard label="Repas étudiant" icon="carbon:wallet" value={CROUS_MEAL_PRICE} detail="Pour tous les étudiants" /> : null}
        {openingHours?.time ? <StatCard label="Horaires" icon="carbon:time" value={openingHours.time} detail={openingHours.detail} className="[&_.font-display]:text-[26px]" /> : null}
      </StatRow>
      {restaurant.closed ? (
        <GradesNotice icon="carbon:locked" label="Restaurant fermé" title="Restaurant fermé pour le moment">
          Le CROUS indique que ce restaurant est fermé : vérifie un autre RU proche.
        </GradesNotice>
      ) : null}
      {closures.map((closure) => (
        <GradesNotice key={closure} icon="carbon:locked" label="Fermeture annoncée" title={closure} />
      ))}
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
