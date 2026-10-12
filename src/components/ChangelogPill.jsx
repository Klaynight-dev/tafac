import { openChangelog, useChangelog } from '../changelogStore'

// The only trace of the changelog on the dashboard: a small « Nouveautés »
// pill with a blue dot, while this device has entries it hasn't seen. In
// the sidebar on wide screens, under the header elsewhere (App.jsx), always
// in the slot of the "Nouvelle version" notice, which goes first. Tapping it
// opens the list, which marks everything seen and makes the pill go away.
// `className` styles the wrapper, rendered only along with the pill.
function ChangelogPill({ className = '' }) {
  const { unseenIds } = useChangelog()

  if (unseenIds.length === 0) return null

  return (
    <div className={className}>
      <button
        type="button"
        className="changelog-pill inline-flex h-8 items-center gap-[7px] rounded-full border px-3 text-text cursor-pointer transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] animate-modal-card-in"
        onClick={openChangelog}
        title="Voir ce qui a changé"
      >
        <span className="changelog-new-dot h-[7px] w-[7px] shrink-0 rounded-full" aria-hidden="true" />
        {/* Font on the span: index.css gives buttons `font: inherit` outside Tailwind's layers. */}
        <span className="font-body text-[13px] font-semibold leading-none whitespace-nowrap">Nouveautés</span>
        <span className="sr-only">
          {`, ${unseenIds.length} à découvrir`}
        </span>
      </button>
    </div>
  )
}

export default ChangelogPill
