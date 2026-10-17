import { useEffect, useState } from 'react'
import { Icon } from '@iconify/react'
import {
  CROUS_RESTAURANTS,
  fetchCrousMenu,
  getStoredCrousRestaurant,
  setStoredCrousRestaurant,
} from '../crousApi'

export default function WidgetCrous({
  visible = true,
  establishment = null,
}) {
  const [selectedRuId, setSelectedRuId] = useState(() => getStoredCrousRestaurant(establishment))
  const [menuData, setMenuData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isPickerOpen, setIsPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchCrousMenu(selectedRuId).then((data) => {
      if (cancelled) return
      setMenuData(data)
      setLoading(false)
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [selectedRuId])

  const handleSelectRu = (id) => {
    setSelectedRuId(id)
    setStoredCrousRestaurant(id)
    setIsPickerOpen(false)
  }

  const currentRu = menuData?.restaurant || CROUS_RESTAURANTS.find((r) => r.id === selectedRuId) || CROUS_RESTAURANTS[0]

  return (
    <article
      className={`crous-card-widget widget-card ${
        visible ? 'widget-card-visible' : ''
      } relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white dark:border-[rgba(255,255,255,0.08)] p-5 text-text shadow-sm transition-all duration-200 min-h-[220px]`}
      style={{
        background: 'var(--color-widget-bg, rgba(255, 255, 255, 0.75))',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        backdropFilter: 'blur(20px) saturate(1.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-9 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Icon icon="carbon:restaurant" className="size-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <button
              type="button"
              onClick={() => setIsPickerOpen((o) => !o)}
              className="m-0 font-body text-[15px] font-bold text-text truncate hover:text-brand transition-colors text-left flex items-center gap-1 cursor-pointer"
            >
              <span className="truncate">{currentRu.name}</span>
              <Icon icon="carbon:chevron-down" className="size-3.5 text-text-muted shrink-0" />
            </button>
            <span className="font-body text-[12px] text-text-muted truncate">
              {currentRu.campus} · {currentRu.hours}
            </span>
          </div>
        </div>

        <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-bg-subtle text-text-muted shrink-0">
          Midi
        </span>
      </div>

      {/* Restaurant Dropdown Picker */}
      {isPickerOpen && (
        <div className="absolute top-16 left-4 right-4 z-30 rounded-2xl border border-border bg-widget-bg p-2 shadow-xl animate-fadeIn">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted px-2.5 py-1">
            Choisir votre restaurant CROUS :
          </div>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto [scrollbar-width:thin]">
            {CROUS_RESTAURANTS.map((ru) => (
              <button
                key={ru.id}
                type="button"
                onClick={() => handleSelectRu(ru.id)}
                className={`w-full text-left p-2.5 rounded-xl text-[13px] font-medium transition-colors flex items-center justify-between cursor-pointer ${
                  ru.id === selectedRuId
                    ? 'bg-brand/10 text-brand font-bold'
                    : 'text-text hover:bg-bg-subtle'
                }`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate">{ru.name}</span>
                  <span className="text-[11px] text-text-muted truncate">{ru.campus}</span>
                </div>
                {ru.id === selectedRuId && (
                  <Icon icon="carbon:checkmark" className="size-4 text-brand shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Body */}
      <div className="my-3 flex flex-col gap-2 min-w-0">
        {loading ? (
          <div className="py-6 text-center text-text-muted text-[13px]">
            Chargement du menu du RU…
          </div>
        ) : menuData?.isWeekend ? (
          <div className="py-4 text-center text-text-muted text-[13px] flex flex-col items-center gap-1">
            <Icon icon="carbon:cafe" className="size-6 text-text-muted/60" />
            <span>Fermé le week-end. Réouverture lundi midi !</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                Plats chauds au choix :
              </span>
              <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                {menuData?.menu?.lunch?.mains?.map((main, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-[12.5px] leading-snug">
                    <span className="text-text font-medium truncate flex-1 min-w-0" title={main.name}>
                      • {main.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md shrink-0 ${
                        main.tag === 'Végétarien'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : main.tag === 'Poisson'
                          ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                          : 'bg-bg-subtle text-text-muted'
                      }`}
                    >
                      {main.tag}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {menuData?.menu?.lunch?.desserts && (
              <div className="flex items-center gap-1.5 text-[11.5px] text-text-muted truncate mt-1 pt-1.5 border-t border-border/50">
                <Icon icon="carbon:cookie" className="size-3.5 text-amber-500 shrink-0" />
                <span className="truncate">
                  Desserts : {menuData.menu.lunch.desserts.join(', ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11.5px] text-text-muted">
        <span>Formule 1 € boursier / 3,30 €</span>
        <span className="text-brand font-medium">Menu du jour</span>
      </div>
    </article>
  )
}
