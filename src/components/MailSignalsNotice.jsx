import { useState } from 'react'
import { Icon } from '@iconify/react'
import { navigateTo } from '../appRoute'
import { SIGNAL_LABELS, dashboardSignals } from '../mailSignals'
import { isMailPageAvailable } from '../navItems'
import { relativeDayText, toDayKey } from '../planningDates'
import { useMailSignals } from '../useMailSignals'

const DISMISSED_KEY = 'l-ent:mail-signals-dismissed'
const ICONS = {
  closure: 'carbon:locked',
  strike: 'carbon:warning-filled',
  cancelled: 'carbon:calendar',
  postponed: 'carbon:time',
  room: 'carbon:location',
}

function readDismissed() {
  try {
    const stored = JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? '[]')
    return Array.isArray(stored) ? stored : []
  } catch {
    return []
  }
}

// "Site bloqué ou fermé · Demain", "Changement de salle · B204".
function titleOf(signal, todayKey) {
  const when = signal.days.find((day) => day >= todayKey)
  return [SIGNAL_LABELS[signal.kind], signal.room, when ? relativeDayText(when, todayKey) : null].filter(Boolean).join(' · ')
}

// What the student's mails announce (mailSignals), at the top of the
// dashboard as the outage banner: site-wide news only for their site
// (`establishment`), each closed for good on this device with its ×.
function MailSignalsNotice({ establishment }) {
  const signals = useMailSignals()
  const [dismissed, setDismissed] = useState(readDismissed)
  const [todayKey] = useState(() => toDayKey(Date.now()))
  const shown = dashboardSignals(signals, establishment, todayKey).filter((signal) => !dismissed.includes(signal.id)).slice(0, 3)

  if (!shown.length) return null

  const dismiss = (id) => {
    const next = [...dismissed, id].slice(-50)
    setDismissed(next)
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next))
    } catch {
      // Storage unavailable: closed for this visit.
    }
  }
  const openMail = (signal) => {
    if (isMailPageAvailable()) navigateTo('mail', { source: 'dashboard_card' })
    else if (signal.href) window.open(signal.href, '_blank', 'noopener,noreferrer')
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Annonces repérées dans tes mails">
      {shown.map((signal) => (
        <li key={signal.id} className="flex items-start gap-3 rounded-[20px] border border-[#f2cf8f] bg-[#fff7e8] px-4 py-3 text-left text-text shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:border-[#6a4d15] dark:bg-[#2f2410]">
          <Icon icon={ICONS[signal.kind]} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#b76e00]" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-1 font-body">
            <p className="m-0 text-sm font-semibold leading-[1.4]">{titleOf(signal, todayKey)}</p>
            <p className="m-0 truncate text-[13px] leading-[1.5] text-text-muted">D’après le mail « {signal.subject} »</p>
            <button type="button" className="self-start border-0 bg-transparent p-0 font-body text-[13px] font-semibold text-text underline underline-offset-2 cursor-pointer" onClick={() => openMail(signal)}>
              Voir le mail
            </button>
          </div>
          <button
            type="button"
            className="-mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text-muted cursor-pointer hover:bg-black/5 hover:text-text dark:hover:bg-white/10"
            onClick={() => dismiss(signal.id)}
            aria-label="Masquer cette annonce"
          >
            <Icon icon="carbon:close" className="size-4" aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  )
}

export default MailSignalsNotice
