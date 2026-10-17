import { useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import { findFreeRooms } from '../../planningUtils'

export default function FreeRoomsModal({
  isOpen,
  onClose,
  events = [],
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('all') // 'all' | 'free_only'

  const now = useMemo(() => new Date(), [])
  const roomResults = useMemo(() => findFreeRooms(events, now), [events, now])

  const filteredResults = useMemo(() => {
    return roomResults.filter((item) => {
      if (filterMode === 'free_only' && !item.isFree) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase()
      return item.room.toLowerCase().includes(q) || (item.currentClass && item.currentClass.toLowerCase().includes(q))
    })
  }, [roomResults, filterMode, searchQuery])

  const freeCount = useMemo(() => roomResults.filter((r) => r.isFree).length, [roomResults])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-rooms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="relative flex flex-col w-full max-w-[620px] max-h-[85vh] rounded-3xl bg-widget-bg border border-border shadow-2xl overflow-hidden animate-scaleIn text-text">
        {/* Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-border/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Icon icon="carbon:workspace" className="size-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <h2 id="free-rooms-modal-title" className="m-0 font-body text-[18px] sm:text-[20px] font-bold text-text truncate">
                Trouver une salle libre
              </h2>
              <p className="m-0 font-body text-[13px] text-text-muted truncate">
                {freeCount} salle{freeCount > 1 ? 's' : ''} disponible{freeCount > 1 ? 's' : ''} en ce moment sur le campus
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-subtle transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <Icon icon="carbon:close" className="size-5" />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-5 sm:px-6 py-3 bg-bg-subtle/40 border-b border-border/60 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Icon
              icon="carbon:search"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-text-muted pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une salle (amphi, 102...)"
              className="w-full h-9 pl-9 pr-8 rounded-full border border-border bg-widget-bg text-[13.5px] text-text placeholder:text-text-muted focus:border-brand focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text"
              >
                <Icon icon="carbon:close" className="size-3.5" />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-full border border-border bg-widget-bg p-0.5 shrink-0 text-[12px] font-semibold">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                filterMode === 'all' ? 'bg-brand text-bg shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Toutes ({roomResults.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('free_only')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                filterMode === 'free_only' ? 'bg-brand text-bg shadow-xs' : 'text-text-muted hover:text-text'
              }`}
            >
              Libres ({freeCount})
            </button>
          </div>
        </div>

        {/* Content List */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-2.5 [scrollbar-width:thin]">
          {filteredResults.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3 text-text-muted">
              <Icon icon="carbon:building" className="size-10 stroke-1 opacity-40" />
              <p className="m-0 font-body text-[14px]">
                {roomResults.length === 0
                  ? 'Aucune salle répertoriée dans le planning chargé aujourd’hui.'
                  : 'Aucune salle ne correspond à votre recherche.'}
              </p>
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={item.room}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.isFree
                    ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50'
                    : 'border-border/60 bg-bg-subtle/30 opacity-75'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      item.isFree
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-500/10 text-text-muted'
                    }`}
                  >
                    <Icon icon={item.isFree ? 'carbon:checkmark' : 'carbon:user-activity'} className="size-5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-body text-[15px] font-bold text-text truncate">
                        {item.room}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.isFree
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {item.statusLabel}
                      </span>
                    </div>
                    <span className="font-body text-[12.5px] text-text-muted mt-0.5 truncate">
                      {item.detail}
                    </span>
                  </div>
                </div>

                {item.isFree && item.availableMinutes > 0 && (
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                      {item.availableMinutes >= 999 ? 'Toute la journée' : `${Math.floor(item.availableMinutes / 60)}h${item.availableMinutes % 60 ? `${item.availableMinutes % 60}`.padStart(2, '0') : ''} dispo`}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/80 bg-bg-subtle/20 flex items-center justify-between text-[12px] text-text-muted">
          <span>Basé sur les créneaux ADE de la journée en cours.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-widget-bg border border-border font-body font-semibold text-text hover:bg-bg-subtle transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
