import { useId } from 'react'
import { formatShare } from '../gradeDetail'
import { formatScore, formatUeCode } from '../gradesSubjects'
import { RING_SIZE, buildRingSegments, buildSegmentMidArc, readSegmentIndexAt } from '../ueRingGeometry'
import { useUeColor } from '../useUeColor'

const FALLBACK_COLOR = '#341200'
// A share this small still shows a sliver.
const MIN_VISIBLE_SHARE = 0.025

function shareText(share) {
  const label = formatShare(share)
  if (!label) return '—'
  return label.startsWith('<') ? label : `≈\u202f${label}`
}

function describe(entry) {
  if (!entry.weight) return `${formatUeCode(entry.ue)}, ${entry.title} : ne compte pas`
  const share = formatShare(entry.share)
  return `${formatUeCode(entry.ue)}, ${entry.title} : poids ${formatScore(entry.weight)}${share ? `, environ ${share} de la moyenne de l’UE` : ''}`
}

// The grade's weight drawn as the "UE validées" ring (same UEs, order,
// colours and geometry): each UE's segment filled in its colour as far as
// the grade's share of that UE's average, the rest a faded track; UEs it
// doesn't count for stay faded. The centre gives the biggest share, or the
// hovered UE's; the caption under it names the UE and its weight. Pointer
// angle, keyboard (← →, one tab stop) and the rows beside it (`active`,
// `onActiveChange`) all pick a UE.
function UeShareRing({ ring, active = null, onActiveChange = () => {}, isKeyboard = false, onKeyboardChange = () => {} }) {
  const id = useId().replace(/:/g, '')
  const paintUe = useUeColor()
  const { ues, top } = ring
  const geometry = buildRingSegments(ues.length)
  const current = active != null ? ues[active] : null
  const shown = current ?? top

  const handleKeyDown = (event) => {
    const moves = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }
    if (!(event.key in moves)) return
    event.preventDefault()
    onKeyboardChange(true)
    const start = active ?? ues.indexOf(top)
    onActiveChange((start + moves[event.key] + ues.length) % ues.length)
  }

  return (
    <div className="grid justify-items-center gap-[10px]">
      <div
        className="gd-share-ring-box relative rounded-full outline-none"
        role="group"
        tabIndex={0}
        aria-label={`Part de cette note dans chaque UE : ${ues.map(describe).join(' ; ')}. Flèches pour parcourir les UE.`}
        onFocus={() => {
          onKeyboardChange(true)
          onActiveChange(ues.indexOf(top))
        }}
        onBlur={() => onActiveChange(null)}
        onKeyDown={handleKeyDown}
      >
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className={`gd-share-ring block size-[136px] overflow-visible max-sm:size-[128px] ${current ? 'has-active' : ''}`}
          aria-hidden="true"
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect()
            const scale = RING_SIZE / box.width
            onKeyboardChange(false)
            onActiveChange(readSegmentIndexAt((event.clientX - box.left) * scale, (event.clientY - box.top) * scale, ues.length))
          }}
          onPointerLeave={() => onActiveChange(null)}
        >
          <defs>
            {geometry.map((segment, index) => (
              <clipPath key={index} id={`${id}-clip-${index}`}>
                <path d={segment.path} />
              </clipPath>
            ))}
          </defs>
          {ues.map((entry, index) => {
            const segment = geometry[index]
            const color = paintUe(entry.color ?? FALLBACK_COLOR)
            const fill = entry.share > 0 ? Math.max(MIN_VISIBLE_SHARE, Math.min(1, entry.share)) : 0
            return (
              <g
                key={entry.ue}
                className={`gd-share-segment ${entry.weight ? '' : 'is-unweighted'} ${active === index ? 'is-active' : ''}`}
                style={{ '--ue-color': color, '--share': fill, '--i': index }}
              >
                <path className="gd-share-track" d={segment.path} />
                {fill ? (
                  <path
                    className="gd-share-fill"
                    d={ues.length === 1 ? buildSegmentMidArc(0, 2 * Math.PI - 0.0001, 0) : buildSegmentMidArc(segment.start, segment.end)}
                    pathLength="1"
                    clipPath={`url(#${id}-clip-${index})`}
                  />
                ) : null}
              </g>
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[4px] text-center" aria-hidden="true">
          <span className="font-display text-[12px] font-semibold leading-none text-text-muted">{formatUeCode(shown.ue)}</span>
          <span className="font-display text-[22px] font-bold leading-none tabular-nums text-text max-sm:text-[20px]">{shown.weight ? shareText(shown.share) : '0'}</span>
          <span className="font-body text-[11px] font-medium leading-none text-text-muted">{shown.weight ? 'de l’UE' : 'ne compte pas'}</span>
        </div>
      </div>
      {/* What the centre's number is, or the hovered UE in full. */}
      <p className="m-0 grid min-h-[34px] w-[156px] content-start gap-[3px] text-balance text-center max-sm:w-[260px]" aria-hidden="true">
        {current ? (
          <>
            <span className="line-clamp-1 font-body text-[12.5px] font-semibold leading-[1.25] text-text">{current.title}</span>
            <span className="font-body text-[12px] font-medium leading-none text-text-muted">{current.weight ? `poids ${formatScore(current.weight)}` : 'poids 0 : ne compte pas'}</span>
          </>
        ) : (
          <span className="font-body text-[12px] font-medium leading-[1.35] text-text-muted">Sa part dans la moyenne de chaque UE</span>
        )}
      </p>
      <p className="sr-only" aria-live="polite">{isKeyboard && current ? describe(current) : ''}</p>
    </div>
  )
}

export default UeShareRing
