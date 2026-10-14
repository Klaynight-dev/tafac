import { Fragment, useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Icon } from '@iconify/react'
import {
  GRADES_LAUNCH_HREF,
  getGrades,
  getGradesDepartmentMessage,
  getGradesReportPdfHref,
  getRequestErrorKind,
  getSemesterGrades,
  openGradesService,
  peekGrades,
  peekSemesterGrades,
  prefetchSemesterGrades,
} from '../entApi'
import {
  GRADE_SCALE,
  buildAbsenceReport,
  buildGradesReport,
  canDownloadReportPdf,
  findNewGrades,
  formatGrade,
  getReleveDepartment,
  htmlToPlainText,
  listGradeSignatures,
  listGradesSemesters,
  parseGradeNumber,
  projectAverages,
} from '../gradesReport'
import { APP_NAME } from '../seo'
import { useSlidingIndicator } from '../useSlidingIndicator'
import { SlidingIndicator } from './SlidingIndicator'

// "Mes notes": the ScoDoc relevé inside the app, organised around what a
// student comes to check: what's new, which UEs are at risk, and what a
// coming grade would change (simulation).

const CARD_CLASSES = 'widget-card widget-card-visible border bg-widget-bg rounded-[22px] max-md:rounded-[20px]'
const PASSING_GRADE = GRADE_SCALE / 2
// Cards rise in one after another on arrival, like the dashboard widgets
// (see .grades-reveal in overrides.css). Capped so late cards don't lag.
const MAX_REVEAL_ORDER = 8

function revealStyle(order = 0) {
  return { '--reveal-order': Math.min(order, MAX_REVEAL_ORDER) }
}
const SEEN_GRADES_KEY = 'l-ent:grades-seen'
const ABSENCES_PREVIEW_COUNT = 4

// ── Small helpers ──

function parseIsoDate(value) {
  if (!value) return null
  // Date-only strings are local days, not UTC midnight.
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatShortDate(value) {
  const date = parseIsoDate(value)
  if (!date) return null
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(sameYear ? null : { year: 'numeric' }) })
}

function formatLongDate(value) {
  const date = parseIsoDate(value)
  return date ? date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : null
}

function gradeToneClass(value) {
  return value != null && value < PASSING_GRADE ? 'text-error' : 'text-text'
}

function toPercent(value) {
  return `${Math.min(100, Math.max(0, (value / GRADE_SCALE) * 100))}%`
}

// Per-user record of the grades already shown, per semester, so the page
// can flag what's new. Lost storage just means nothing is flagged.
function readSeenGrades(scope) {
  try {
    const stored = JSON.parse(localStorage.getItem(SEEN_GRADES_KEY) || 'null')
    return stored && stored.user === (scope ?? null) && stored.semesters ? stored.semesters : {}
  } catch {
    return {}
  }
}

function writeSeenGrades(scope, semesters) {
  try {
    localStorage.setItem(SEEN_GRADES_KEY, JSON.stringify({ user: scope ?? null, semesters }))
  } catch {
    // Private mode or full storage: "new" badges just won't persist.
  }
}

function describeLoadError(data, error) {
  if (data && data.authenticated === false && !data.error) {
    return 'Ta session a expiré. Reconnecte-toi pour voir tes notes.'
  }

  const kind = error ? getRequestErrorKind(error) : data?.errorKind
  if (kind === 'network' || kind === 'timeout') {
    return 'Impossible de joindre le serveur. Vérifie ta connexion puis réessaie.'
  }

  return 'ScoDoc ne répond pas pour le moment. Réessaie dans quelques minutes, ou ouvre-le directement.'
}

function revealModule(code) {
  window.requestAnimationFrame(() => {
    const target = document.querySelector(`[data-module-code="${CSS.escape(code)}"]`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    target?.querySelector('button')?.focus({ preventScroll: true })
  })
}

// ── Building blocks ──

// The student's grade against the promo: min–max band, promo average tick,
// the student's dot. The text alternative carries the same numbers.
function PromoRange({ value = null, min, moy, max, color = null }) {
  if (min == null && moy == null && max == null) {
    return null
  }

  const parts = [
    min != null ? `min ${formatGrade(min)}` : null,
    moy != null ? `moy. ${formatGrade(moy)}` : null,
    max != null ? `max ${formatGrade(max)}` : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div
        className="relative h-[6px] rounded-full bg-border"
        role="img"
        aria-label={`Promo : ${parts.join(', ')}${value != null ? `. Toi : ${formatGrade(value)}` : ''}`}
      >
        {min != null && max != null ? (
          <span className="absolute inset-y-0 rounded-full bg-text-30" style={{ left: toPercent(min), width: `calc(${toPercent(max)} - ${toPercent(min)})` }} />
        ) : null}
        {moy != null ? (
          <span className="absolute -top-[3px] -bottom-[3px] w-[2px] -translate-x-1/2 rounded-full bg-text-60" style={{ left: toPercent(moy) }} />
        ) : null}
        {value != null ? (
          <span
            className="absolute top-1/2 size-[12px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-widget-bg transition-[left] duration-300 ease-out"
            style={{ left: toPercent(value), background: color ?? 'var(--color-text)' }}
          />
        ) : null}
      </div>
      <p className="m-0 font-body text-[12px] leading-tight text-text-muted" aria-hidden="true">
        Promo · {parts.join(' · ')}
      </p>
    </div>
  )
}

// Official value, or official → projected while simulating.
function AverageValue({ official, projected = null, size }) {
  const sizes = {
    xl: ['text-[56px] max-md:text-[48px] leading-[0.9] tracking-[-0.02em]', 'text-[22px]'],
    md: ['text-[30px] leading-none', 'text-[15px]'],
  }[size]
  const shown = projected ?? official
  const changed = projected != null && official != null && Math.abs(projected - official) >= 0.005

  return (
    <p className="m-0 flex flex-wrap items-end gap-x-2 gap-y-1 leading-none">
      {changed ? (
        <span className="pb-1 font-display text-[15px] font-semibold text-text-muted line-through decoration-1">{formatGrade(official)}</span>
      ) : null}
      <span className="inline-flex items-end gap-0.5">
        <span className={`font-display font-bold ${sizes[0]} ${gradeToneClass(shown)}`}>{formatGrade(shown)}</span>
        {shown != null ? <span className={`pb-0.5 font-display font-medium text-text-muted ${sizes[1]}`}>/{GRADE_SCALE}</span> : null}
      </span>
      {changed ? (
        <span className={`pb-1 font-body text-[13px] font-semibold ${projected > official ? 'text-success-text' : 'text-error'}`}>
          {projected > official ? '+' : '−'}{formatGrade(Math.abs(projected - official))}
        </span>
      ) : null}
    </p>
  )
}

function SectionTitle({ id, children, count = null, aside = null }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <h2 id={id} className="m-0 text-[22px] leading-[1.1] max-md:text-[20px]">
        {children}
        {count != null ? <span className="ml-2 font-body text-[15px] font-medium text-text-muted">{count}</span> : null}
      </h2>
      {aside}
    </div>
  )
}

// Segmented control whose selection slides from one option to the next.
function SegmentedControl({ label, options, value, onChange, size = 'md' }) {
  const [groupRef, box] = useSlidingIndicator(`${value}:${options.map((option) => option.value).join(',')}`)

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className="relative inline-flex max-w-full gap-1 rounded-full border border-border bg-widget-bg p-1"
    >
      <SlidingIndicator box={box} className="rounded-full bg-brand" />
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            data-active={selected ? 'true' : undefined}
            onClick={() => onChange(option.value)}
            className={`relative flex shrink-0 flex-col items-center justify-center rounded-full border-0 bg-transparent font-body font-semibold leading-none transition-colors duration-200 ${
              size === 'lg' ? 'gap-1 px-4 py-2' : 'px-3.5 py-1.5 text-[14px]'
            } ${selected ? 'text-bg' : 'text-text-secondary hover:text-text'}`}
          >
            <span className={size === 'lg' ? 'text-[15px]' : ''}>
              {option.label}
              {option.count != null ? <span className="ml-1.5 opacity-60">{option.count}</span> : null}
            </span>
            {option.detail ? <span className="text-[11px] font-medium opacity-65">{option.detail}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function GradeValue({ grade, size = 'md' }) {
  if (grade.kind !== 'number') {
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-body text-[12px] font-semibold ${
        grade.kind === 'absent' ? 'bg-error-bg text-error' : 'bg-bg-subtle text-text-secondary'
      }`}>
        {grade.label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-end gap-0.5 leading-none">
      <span className={`font-display font-bold leading-none ${size === 'lg' ? 'text-[26px]' : 'text-[20px]'} ${gradeToneClass(grade.value)}`}>
        {grade.label}
      </span>
      <span className="pb-px font-display text-[13px] font-medium text-text-muted">/{GRADE_SCALE}</span>
    </span>
  )
}

function NewBadge() {
  return <span className="rounded-full bg-brand px-1.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-[0.04em] text-bg">Nouveau</span>
}

function StatusMessage({ icon, title, detail = null, action = null }) {
  return (
    <div className={`${CARD_CLASSES} grades-reveal flex flex-col items-start gap-3 p-5`}>
      <Icon icon={icon} className="size-6 text-text-muted" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="m-0 font-body text-[16px] font-semibold text-text">{title}</p>
        {detail ? <p className="m-0 font-body text-[14px] leading-snug text-text-secondary whitespace-pre-line">{detail}</p> : null}
      </div>
      {action}
    </div>
  )
}

function LoadingDots({ label }) {
  return (
    <div className="flex items-center gap-3 py-10 text-text-muted" role="status" aria-live="polite">
      <span className="inline-flex gap-[6px]" aria-hidden="true">
        {[0, 140, 280].map((delay) => (
          <span key={delay} className="lent-button-dot h-[5px] w-[5px] rounded-full bg-current" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      <span className="font-body text-[14px]">{label}</span>
    </div>
  )
}

const SECONDARY_BUTTON = 'inline-flex items-center gap-1.5 rounded-full border border-border bg-widget-bg px-3.5 py-2 font-body text-[14px] font-semibold text-text no-underline transition-colors duration-150 hover:bg-bg-subtle'

function OpenScodocButton() {
  if (!GRADES_LAUNCH_HREF) {
    return null
  }

  return (
    <button type="button" onClick={openGradesService} className={SECONDARY_BUTTON}>
      ScoDoc
      <Icon icon="carbon:arrow-up-right" className="size-3.5" aria-hidden="true" />
    </button>
  )
}

// ── Sections ──

function OverviewCard({ report, projection, revealOrder }) {
  const { average, rank, groupRanks, ects, absenceSummary, situation, semester } = report
  const atRisk = report.ues.filter((ue) => {
    const value = projection?.ues[ue.code]?.projected ?? ue.average.value
    return value != null && value < PASSING_GRADE
  })
  const facts = [
    rank ? {
      label: 'Rang',
      value: `${rank.value}${rank.total ? ` / ${rank.total}` : ''}`,
      detail: groupRanks.length ? groupRanks.map((group) => `${group.name} : ${group.value}${group.total ? `/${group.total}` : ''}`).join(' · ') : null,
    } : null,
    ects && ects.total ? {
      label: 'ECTS',
      value: `${formatGrade(ects.earned ?? 0)} / ${formatGrade(ects.total)}`,
      detail: ects.earned ? null : 'Attribués au jury',
    } : null,
    absenceSummary && absenceSummary.total != null ? {
      label: 'Absences injustifiées',
      value: `${formatGrade(absenceSummary.unjustified ?? 0)}${absenceSummary.unit ? ` ${absenceSummary.unit}` : ''}`,
      detail: `${formatGrade(absenceSummary.total)}${absenceSummary.unit ? ` ${absenceSummary.unit}` : ''} au total`,
    } : null,
    semester.groups.length ? { label: 'Groupes', value: semester.groups.join(', '), detail: null } : null,
  ].filter(Boolean)

  return (
    <article style={revealStyle(revealOrder)} className={`${CARD_CLASSES} grades-reveal grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-6 p-5 max-lg:grid-cols-1 max-lg:gap-5 max-md:p-4`}>
      <div className="flex flex-col gap-3 min-w-0">
        <span className="font-body text-base font-medium text-text-muted">
          Moyenne générale{projection ? ' simulée' : ''}
        </span>
        {average.value != null || projection?.general.projected != null ? (
          <AverageValue official={average.value} projected={projection?.general.projected ?? null} size="xl" />
        ) : (
          <p className="m-0 font-body text-[15px] text-text-muted">Pas encore de moyenne : elle apparaît avec les premières notes d'UE.</p>
        )}
        {report.showPromoStats ? (
          <div className="max-w-[360px]">
            <PromoRange value={projection?.general.projected ?? average.value} min={average.min} moy={average.moy} max={average.max} />
          </div>
        ) : null}
        {report.ues.length ? (
          <p className={`m-0 font-body text-[14px] font-semibold leading-snug ${atRisk.length ? 'text-error' : 'text-success-text'}`}>
            {atRisk.length
              ? `${atRisk.length === 1 ? '1 UE' : `${atRisk.length} UE`} sous 10 : ${atRisk.map((ue) => ue.code).join(', ')}`
              : 'Toutes tes UE sont à 10 ou plus'}
          </p>
        ) : null}
        {situation.length ? (
          <ul className="m-0 flex flex-col gap-1 p-0 list-none">
            {situation.map((line) => (
              <li key={line} className="font-body text-[14px] font-medium leading-snug text-text whitespace-pre-line">{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {facts.length ? (
        <dl className="m-0 grid grid-cols-2 gap-x-5 gap-y-4 self-center max-xs:grid-cols-1">
          {facts.map((fact) => (
            <div key={fact.label} className="flex flex-col gap-1 min-w-0">
              <dt className="font-body text-[13px] font-medium text-text-muted">{fact.label}</dt>
              <dd className="m-0 font-body text-[17px] font-semibold leading-tight text-text">{fact.value}</dd>
              {fact.detail ? <dd className="m-0 font-body text-[12px] leading-snug text-text-muted">{fact.detail}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  )
}

function RecentGrades({ evaluations, newIds, onOpen, revealOrder }) {
  if (!evaluations.length) {
    return null
  }

  const newCount = evaluations.filter((evaluation) => newIds.has(evaluation.id)).length

  return (
    <section className="flex flex-col gap-3" aria-labelledby="grades-recent-title">
      <SectionTitle id="grades-recent-title">
        {newCount ? `${newCount} nouvelle${newCount > 1 ? 's' : ''} note${newCount > 1 ? 's' : ''}` : 'Dernières notes'}
      </SectionTitle>
      <ol style={revealStyle(revealOrder)} className={`${CARD_CLASSES} grades-reveal m-0 flex flex-col overflow-hidden p-0 list-none`}>
        {evaluations.map((evaluation) => (
          <li key={evaluation.id} className="border-b border-border last:border-b-0">
            <button
              type="button"
              onClick={() => onOpen(evaluation.moduleCode)}
              className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-text transition-colors duration-150 hover:bg-bg-subtle"
            >
              <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate font-body text-[15px] font-semibold leading-snug">{evaluation.description}</span>
                  {newIds.has(evaluation.id) ? <NewBadge /> : null}
                </span>
                <span className="truncate font-body text-[13px] leading-snug text-text-muted">
                  {evaluation.moduleCode} · {evaluation.moduleTitle}
                  <span className="xs:hidden">{evaluation.date ? ` · ${formatShortDate(evaluation.date)}` : ''}</span>
                </span>
              </span>
              <span className="shrink-0 font-body text-[13px] text-text-muted max-xs:hidden">{formatShortDate(evaluation.date)}</span>
              <span className="w-[72px] shrink-0 text-right"><GradeValue grade={evaluation.grade} /></span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}

function UeCard({ ue, projected, showPromoStats, onShowGrades, revealOrder }) {
  const [open, setOpen] = useState(false)
  const detailsId = useId()
  const value = projected ?? ue.average.value

  return (
    // Five subgrid rows (title, promo, facts, actions, details) shared with
    // the other cards of the row, so their blocks line up whatever the title
    // length or an opened coefficient list.
    <article className={`${CARD_CLASSES} grades-reveal row-span-5 grid grid-rows-subgrid gap-y-0 p-4`} style={revealStyle(revealOrder)}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-[3px] size-[14px] shrink-0 rounded-[5px] shadow-[inset_0_0_0_1px_var(--color-border)]" style={{ background: ue.color ?? 'var(--color-text-30)' }} />
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="font-body text-[13px] font-semibold text-text-muted">{ue.code}</span>
          <h3 className="m-0 text-[17px] leading-[1.2]">{ue.title}</h3>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <AverageValue official={ue.average.value} projected={projected} size="md" />
          {value != null && value < PASSING_GRADE ? <span className="font-body text-[12px] font-semibold text-error">Sous 10</span> : null}
        </div>
      </div>

      <div>
        {showPromoStats ? (
          <div className="pt-4">
            <PromoRange value={value} min={ue.average.min} moy={ue.average.moy} max={ue.average.max} color={ue.color} />
          </div>
        ) : null}
      </div>

      <div className="self-end pt-3 flex flex-wrap gap-x-4 gap-y-1 font-body text-[13px] text-text-secondary">
        {ue.rank ? <span>Rang {ue.rank.value}{ue.rank.total ? ` / ${ue.rank.total}` : ''}</span> : null}
        {ue.ects?.total ? <span>{formatGrade(ue.ects.earned ?? 0)} / {formatGrade(ue.ects.total)} ECTS</span> : null}
        {ue.bonus ? <span>Bonus +{formatGrade(ue.bonus)}</span> : null}
        {ue.malus ? <span className="text-error">Malus −{formatGrade(ue.malus)}</span> : null}
        {ue.capitalized ? <span>UE capitalisée</span> : null}
      </div>

      <div className="pt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onShowGrades(ue.code)}
          className="rounded-full border border-border bg-transparent px-3 py-1.5 font-body text-[13px] font-semibold text-text transition-colors duration-150 hover:bg-bg-subtle"
        >
          Voir les notes de l'UE
        </button>
        {ue.modules.length ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((current) => !current)}
            className="inline-flex items-center gap-1 rounded-full border-0 bg-transparent px-2 py-1.5 font-body text-[13px] font-semibold text-text-secondary hover:text-text"
          >
            Coefficients
            <Icon icon="carbon:chevron-down" className={`size-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <ul id={detailsId} className="m-0 mt-3 flex flex-col self-start p-0 list-none border-t border-border">
          {ue.modules.map((module) => (
            <li key={`${module.kind}-${module.code}`} className="flex items-baseline gap-3 border-b border-border py-2 last:border-b-0">
              <span className="w-[72px] shrink-0 font-body text-[12px] font-semibold text-text-muted">{module.code}</span>
              <span className="min-w-0 flex-1 font-body text-[14px] leading-snug text-text">{module.title}</span>
              <span className="shrink-0 font-body text-[12px] text-text-muted">coef {formatGrade(module.coef)}</span>
              <span className={`w-[44px] shrink-0 text-right font-body text-[14px] font-semibold ${gradeToneClass(module.average)}`}>
                {formatGrade(module.average)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function SimulationInput({ evaluation, value, onChange }) {
  const inputId = useId()
  const [draft, setDraft] = useState(value != null ? formatGrade(value) : '')
  const invalid = draft.trim() !== '' && (parseGradeNumber(draft) == null || parseGradeNumber(draft) < 0 || parseGradeNumber(draft) > GRADE_SCALE)

  const commit = (text) => {
    setDraft(text)
    const number = parseGradeNumber(text)
    if (text.trim() === '') onChange(null)
    else if (number != null && number >= 0 && number <= GRADE_SCALE) onChange(number)
  }

  return (
    <label htmlFor={inputId} className="flex items-center gap-2">
      <span className="font-body text-[13px] font-medium text-text-secondary">
        {evaluation.grade.kind === 'number' ? 'Et si j’avais' : 'Note espérée'}
      </span>
      <input
        id={inputId}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={draft}
        placeholder={evaluation.grade.kind === 'number' ? evaluation.grade.label : '—'}
        aria-invalid={invalid || undefined}
        aria-label={`Note simulée pour ${evaluation.description}, sur ${GRADE_SCALE}`}
        onChange={(event) => commit(event.target.value)}
        className={`h-9 w-[72px] scroll-mb-48 rounded-[12px] border bg-bg-input px-2.5 text-center font-body text-[15px] font-semibold text-text placeholder:font-medium placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-0 ${
          invalid ? 'border-error' : 'border-border-input'
        }`}
      />
      <span className="font-body text-[13px] text-text-muted">/{GRADE_SCALE}</span>
    </label>
  )
}

function EvaluationRow({ evaluation, isNew, showPromoStats, ueColors, simulating, simulationNonce, override, onOverride }) {
  const meta = [
    formatLongDate(evaluation.date),
    evaluation.coef != null ? `coef ${formatGrade(evaluation.coef)}` : null,
  ].filter(Boolean)
  const awaiting = evaluation.grade.kind === 'pending' || evaluation.grade.kind === 'none'
  const [fieldOpen, setFieldOpen] = useState(false)
  const showsField = fieldOpen || override != null || evaluation.grade.kind !== 'number'

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 border-t border-border py-3">
      <div className="flex flex-col gap-1 min-w-0">
        <span className="flex flex-wrap items-center gap-2 font-body text-[15px] font-semibold leading-snug text-text">
          {evaluation.description}
          {isNew ? <NewBadge /> : null}
          {evaluation.typeLabel ? (
            <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-semibold text-text-secondary">{evaluation.typeLabel}</span>
          ) : null}
        </span>
        {meta.length ? <span className="font-body text-[13px] text-text-muted">{meta.join(' · ')}</span> : null}
      </div>
      <div className="self-start pt-0.5 text-right"><GradeValue grade={evaluation.grade} size="lg" /></div>

      {simulating && evaluation.canSimulate ? (
        // Grades still to come (or missed) get a field straight away; a known
        // grade only on demand, to keep the list readable.
        showsField ? (
          <div className="col-span-2 rounded-[14px] bg-brand-subtle px-3 py-2">
            <SimulationInput key={simulationNonce} evaluation={evaluation} value={override} onChange={onOverride} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setFieldOpen(true)}
            className="col-span-2 justify-self-start rounded-full border-0 bg-transparent px-0 py-0.5 font-body text-[13px] font-semibold text-text-secondary underline decoration-text-30 underline-offset-2 hover:text-text"
          >
            Simuler une autre note
          </button>
        )
      ) : null}

      {(showPromoStats && !awaiting) || evaluation.weights.length ? (
        <div className="col-span-2 grid grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start gap-x-6 gap-y-2 max-md:grid-cols-1">
          {showPromoStats && !awaiting ? (
            <PromoRange value={evaluation.grade.value} min={evaluation.promo.min} moy={evaluation.promo.moy} max={evaluation.promo.max} />
          ) : <span className="max-md:hidden" />}
          {evaluation.weights.length ? (
            <ul className="m-0 flex flex-wrap gap-1.5 p-0 list-none md:justify-end" aria-label="Poids dans les UE">
              {evaluation.weights.map((entry) => (
                <li key={entry.ue} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-body text-[12px] text-text-secondary">
                  <span aria-hidden="true" className="size-[8px] rounded-[3px]" style={{ background: ueColors[entry.ue] ?? 'var(--color-text-30)' }} />
                  {entry.ue} × {formatGrade(entry.weight)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function ModuleItem({ module, open, onToggle, newIds, ueFilter, ...rowProps }) {
  const panelId = useId()
  const evaluations = ueFilter
    ? module.evaluations.filter((evaluation) => evaluation.weights.length === 0 || evaluation.weights.some((entry) => entry.ue === ueFilter))
    : module.evaluations
  const newCount = evaluations.filter((evaluation) => newIds.has(evaluation.id)).length
  const summary = [
    module.gradedCount ? `${module.gradedCount} note${module.gradedCount > 1 ? 's' : ''}` : 'Aucune note',
    module.pendingCount ? `${module.pendingCount} en attente` : null,
  ].filter(Boolean).join(' · ')
  const ueCoef = ueFilter ? module.ueCoefs.find((entry) => entry.ue === ueFilter) : null

  return (
    <li className="scroll-mt-24 border-b border-border last:border-b-0" data-module-code={module.code}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 border-0 bg-transparent px-4 py-3.5 text-left text-text transition-colors duration-150 hover:bg-bg-subtle"
      >
        <Icon icon="carbon:chevron-right" className={`size-4 shrink-0 text-text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
        <span className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="flex items-center gap-2 font-body text-[12px] font-semibold text-text-muted">
            {module.code}
            {newCount ? <NewBadge /> : null}
          </span>
          <span className="font-body text-[16px] font-semibold leading-snug">{module.title}</span>
          <span className="font-body text-[13px] text-text-muted">
            {summary}
            {ueCoef ? ` · coef ${formatGrade(ueCoef.coef)} dans ${ueFilter}` : ''}
          </span>
        </span>
        {!ueFilter && module.ueCoefs.length ? (
          <span className="flex shrink-0 gap-1 max-md:hidden" aria-label={`Coefficients : ${module.ueCoefs.map((entry) => `${entry.ue} ${formatGrade(entry.coef)}`).join(', ')}`}>
            {module.ueCoefs.map((entry) => (
              <span key={entry.ue} className="inline-flex items-center gap-1 rounded-full bg-bg-subtle px-2 py-0.5 font-body text-[11px] font-semibold text-text-secondary" title={`Coefficient dans ${entry.ue}`}>
                <span aria-hidden="true" className="size-[7px] rounded-[2px]" style={{ background: entry.color ?? 'var(--color-text-30)' }} />
                {formatGrade(entry.coef)}
              </span>
            ))}
          </span>
        ) : null}
        <span className="flex w-[78px] shrink-0 flex-col items-end gap-0.5">
          <span className={`font-display text-[22px] font-bold leading-none ${gradeToneClass(module.average)}`}>{formatGrade(module.average)}</span>
          {module.averageIsIndicative ? <span className="font-body text-[11px] text-text-muted">indicative</span> : null}
        </span>
      </button>
      {open ? (
        <div id={panelId} className="px-4 pb-2 pl-11 max-md:pl-4">
          {!ueFilter && module.ueCoefs.length ? (
            <p className="m-0 pb-2 font-body text-[13px] text-text-secondary md:hidden">
              Coefficients : {module.ueCoefs.map((entry) => `${entry.ue} ${formatGrade(entry.coef)}`).join(' · ')}
            </p>
          ) : null}
          {evaluations.length ? (
            <ul className="m-0 p-0 list-none">
              {evaluations.map((evaluation) => (
                <EvaluationRow
                  key={evaluation.id}
                  evaluation={evaluation}
                  isNew={newIds.has(evaluation.id)}
                  override={rowProps.overrides[evaluation.id] ?? null}
                  onOverride={(value) => rowProps.onOverride(evaluation.id, value)}
                  showPromoStats={rowProps.showPromoStats}
                  ueColors={rowProps.ueColors}
                  simulating={rowProps.simulating}
                  simulationNonce={rowProps.simulationNonce}
                />
              ))}
            </ul>
          ) : (
            <p className="m-0 border-t border-border py-3 font-body text-[14px] text-text-muted">Aucune évaluation publiée pour ce module.</p>
          )}
          {module.averageIsIndicative ? (
            <p className="m-0 border-t border-border py-2 font-body text-[12px] leading-snug text-text-muted">
              Moyenne indicative : tes notes pondérées par leur coefficient. En BUT, ScoDoc ne calcule pas de moyenne officielle par module, seules les moyennes d'UE comptent.
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function ModulesSection({ revealOrder, report, kindFilter, onKindFilterChange, ueFilter, onUeFilterChange, openIds, onOpenIdsChange, newIds, simulation }) {
  const ueColors = useMemo(() => Object.fromEntries(report.ues.map((ue) => [ue.code, ue.color])), [report.ues])
  const allModules = [...report.resources, ...report.saes]
  if (!allModules.length) {
    return null
  }

  const visibleModules = allModules
    .filter((module) => kindFilter === 'all' || module.kind === kindFilter)
    .filter((module) => !ueFilter || module.ueCoefs.some((entry) => entry.ue === ueFilter))
  const allOpen = visibleModules.length > 0 && visibleModules.every((module) => openIds.has(module.id))
  const kindOptions = [
    { value: 'all', label: 'Tout', count: allModules.length },
    report.resources.length ? { value: 'resource', label: 'Ressources', count: report.resources.length } : null,
    report.saes.length ? { value: 'sae', label: 'SAÉ', count: report.saes.length } : null,
  ].filter(Boolean)

  const toggleModule = (id) => {
    const next = new Set(openIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onOpenIdsChange(next)
  }
  const toggleAll = () => {
    const next = new Set(openIds)
    for (const module of visibleModules) {
      if (allOpen) next.delete(module.id)
      else next.add(module.id)
    }
    onOpenIdsChange(next)
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="grades-modules-title" id="grades-modules">
      <SectionTitle
        id="grades-modules-title"
        aside={(
          <button type="button" onClick={toggleAll} className={SECONDARY_BUTTON}>
            <Icon icon={allOpen ? 'carbon:collapse-all' : 'carbon:expand-all'} className="size-4" aria-hidden="true" />
            {allOpen ? 'Tout replier' : 'Tout déplier'}
          </button>
        )}
      >
        Notes par module
      </SectionTitle>

      <div className="flex flex-wrap items-center gap-2">
        {kindOptions.length > 2 ? (
          <SegmentedControl label="Type de module" options={kindOptions} value={kindFilter} onChange={onKindFilterChange} />
        ) : null}
        {report.ues.length > 1 ? (
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrer par UE">
            {report.ues.map((ue) => {
              const selected = ue.code === ueFilter
              return (
                <button
                  key={ue.code}
                  type="button"
                  aria-pressed={selected}
                  title={ue.title}
                  onClick={() => onUeFilterChange(selected ? null : ue.code)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-body text-[13px] font-semibold transition-colors duration-150 ${
                    selected ? 'border-brand bg-brand text-bg' : 'border-border bg-widget-bg text-text-secondary hover:text-text'
                  }`}
                >
                  <span aria-hidden="true" className="size-[8px] rounded-[3px]" style={{ background: ue.color ?? 'var(--color-text-30)' }} />
                  {ue.code}
                  {selected ? <Icon icon="carbon:close" className="size-3.5" aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      {visibleModules.length ? (
        <ul style={revealStyle(revealOrder)} className={`${CARD_CLASSES} grades-reveal m-0 flex flex-col overflow-hidden p-0 list-none`}>
          {visibleModules.map((module) => (
            <ModuleItem
              key={module.id}
              module={module}
              open={openIds.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              newIds={newIds}
              ueFilter={ueFilter}
              showPromoStats={report.showPromoStats}
              ueColors={ueColors}
              simulating={simulation.active}
              overrides={simulation.overrides}
              simulationNonce={simulation.nonce}
              onOverride={simulation.setOverride}
            />
          ))}
        </ul>
      ) : (
        <StatusMessage icon="carbon:filter" title="Aucun module avec ces filtres" action={(
          <button type="button" className={SECONDARY_BUTTON} onClick={() => { onKindFilterChange('all'); onUeFilterChange(null) }}>
            Retirer les filtres
          </button>
        )} />
      )}
    </section>
  )
}

const ABSENCE_STATUS = {
  justified: { label: 'Justifiée', className: 'bg-success-bg text-success-text' },
  unjustified: { label: 'Injustifiée', className: 'bg-error-bg text-error' },
  late: { label: 'Retard', className: 'bg-bg-subtle text-text-secondary' },
}

function AbsencesSection({ absences, revealOrder }) {
  const [showAll, setShowAll] = useState(false)
  if (!absences.visible) {
    return null
  }

  const entries = showAll ? absences.entries : absences.entries.slice(0, ABSENCES_PREVIEW_COUNT)

  return (
    <section className="flex flex-col gap-3" aria-labelledby="grades-absences-title">
      <SectionTitle id="grades-absences-title" count={absences.entries.length || null}>Absences</SectionTitle>
      <div style={revealStyle(revealOrder)} className={`${CARD_CLASSES} grades-reveal flex flex-col gap-4 p-4`}>
        {absences.totals ? (
          <dl className="m-0 grid grid-cols-3 gap-3 max-xs:grid-cols-1">
            {[
              ['Injustifiées', absences.totals.unjustified],
              ['Justifiées', absences.totals.justified],
              ['Retards', absences.totals.late],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="font-body text-[13px] font-medium text-text-muted">{label}</dt>
                <dd className="m-0 font-display text-[22px] font-bold leading-tight text-text">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {entries.length ? (
          <ul className="m-0 flex flex-col p-0 list-none">
            {entries.map((entry) => {
              const status = ABSENCE_STATUS[entry.status]
              return (
                <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-t border-border py-3">
                  <span className="font-body text-[15px] font-semibold leading-snug text-text">
                    {formatLongDate(entry.date)}{entry.endDate ? ` → ${formatLongDate(entry.endDate)}` : ''}
                    <span className="font-medium text-text-secondary"> · {entry.start} – {entry.end}</span>
                  </span>
                  <span className={`row-span-2 self-center rounded-full px-2.5 py-1 font-body text-[12px] font-semibold ${status.className}`}>{status.label}</span>
                  <span className="font-body text-[13px] leading-snug text-text-muted">
                    {[entry.subject ?? 'Matière non précisée', entry.teacher].filter(Boolean).join(' · ')}
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="m-0 font-body text-[14px] text-text-muted">Aucune absence enregistrée sur ce semestre.</p>
        )}
        {absences.entries.length > ABSENCES_PREVIEW_COUNT ? (
          <button type="button" className={`${SECONDARY_BUTTON} self-start`} onClick={() => setShowAll((current) => !current)} aria-expanded={showAll}>
            {showAll ? 'Voir moins' : `Voir les ${absences.entries.length} absences`}
          </button>
        ) : null}
        {absences.notice ? (
          <p className="m-0 border-t border-border pt-3 font-body text-[12px] leading-snug text-text-muted whitespace-pre-line">{absences.notice}</p>
        ) : null}
      </div>
    </section>
  )
}

// Stays in view while typing grades further down: sticky at the top of the
// self-scrolling column on wide screens; on phones (window scroll under
// overflow-x: hidden ancestors, where sticky can't hold) fixed above the tab
// bar, in thumb reach.
function SimulationBar({ projection, overrideCount, onReset, onClose }) {
  const general = projection.general
  const changed = general.projected != null && general.official != null && Math.abs(general.projected - general.official) >= 0.005

  return (
    <div className="z-20 4xl:sticky 4xl:top-3 max-4xl:fixed max-4xl:inset-x-3 max-4xl:bottom-[calc(env(safe-area-inset-bottom)+84px)]" role="region" aria-label="Simulation">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[18px] bg-brand px-4 py-3 text-bg shadow-[0_12px_30px_-12px_var(--color-shadow)]">
        <Icon icon="carbon:calculator" className="size-5 shrink-0 max-xs:hidden" aria-hidden="true" />
        <p className="m-0 min-w-0 flex-1 font-body text-[14px] leading-snug" aria-live="polite">
          {overrideCount === 0 ? (
            'Saisis des notes dans les modules ci-dessous pour voir leur effet sur tes moyennes.'
          ) : (
            <>
              <span className="font-semibold">Moyenne simulée : {formatGrade(general.projected)}/{GRADE_SCALE}</span>
              {changed ? <span className="opacity-75"> (actuelle {formatGrade(general.official)})</span> : null}
              <span className="opacity-75"> · {overrideCount} note{overrideCount > 1 ? 's' : ''} simulée{overrideCount > 1 ? 's' : ''}</span>
            </>
          )}
        </p>
        <div className="flex gap-2">
          {overrideCount ? (
            <button type="button" onClick={onReset} className="rounded-full border border-current/30 bg-transparent px-3 py-1.5 font-body text-[13px] font-semibold text-bg hover:bg-white/10">
              Effacer
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="rounded-full border-0 bg-bg px-3 py-1.5 font-body text-[13px] font-semibold text-text hover:opacity-90">
            Terminer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──

function GradesPage({ storageScope = null }) {
  // Straight from the in-memory cache when the grades were loaded recently.
  const [base, setBase] = useState(() => {
    const cached = peekGrades()
    return cached ? { status: 'ok', payload: cached.grades, error: null } : { status: 'loading', payload: null, error: null }
  })
  const [reloadNonce, setReloadNonce] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [semesterPayloads, setSemesterPayloads] = useState({})
  const [departmentMessages, setDepartmentMessages] = useState({})
  const [newIdsBySemester, setNewIdsBySemester] = useState({})
  const [kindFilter, setKindFilter] = useState('all')
  const [ueFilter, setUeFilter] = useState(null)
  const [openIds, setOpenIds] = useState(() => new Set())
  const [simulating, setSimulating] = useState(false)
  const [overrides, setOverrides] = useState({})
  // Bumped on reset so the grade inputs drop what was typed.
  const [simulationNonce, setSimulationNonce] = useState(0)

  useEffect(() => {
    const previousTitle = document.title
    document.title = `Mes notes · ${APP_NAME}`
    return () => { document.title = previousTitle }
  }, [])

  useEffect(() => {
    let cancelled = false

    getGrades({ force: reloadNonce > 0 })
      .then((data) => {
        if (cancelled) return
        if (!data?.authenticated || data.error || !data.grades) {
          setBase({ status: 'error', payload: null, error: describeLoadError(data, null) })
          return
        }
        setBase({ status: 'ok', payload: data.grades, error: null })
      })
      .catch((error) => {
        if (!cancelled) setBase({ status: 'error', payload: null, error: describeLoadError(null, error) })
      })

    return () => { cancelled = true }
  }, [reloadNonce])

  const basePayload = base.payload
  const semesters = useMemo(() => listGradesSemesters(basePayload?.semestres), [basePayload])
  // The first-connection answer already holds the newest semester's relevé.
  const newestId = semesters[0]?.id ?? 'current'
  const activeId = selectedId ?? newestId
  const cachedSemester = activeId === newestId ? null : peekSemesterGrades(activeId)
  const activeEntry = activeId === newestId && basePayload
    ? { status: 'ok', payload: basePayload }
    : semesterPayloads[activeId] ?? (cachedSemester ? { status: 'ok', payload: cachedSemester.grades } : { status: 'loading' })

  // The other semesters load in the background once the page has settled, so
  // switching to them is instant.
  useEffect(() => {
    if (!basePayload || semesters.length < 2) {
      return undefined
    }

    const otherIds = semesters.slice(1).map((semester) => semester.id)
    const start = () => { void prefetchSemesterGrades(otherIds) }
    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(start, { timeout: 2000 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timeoutId = window.setTimeout(start, 800)
    return () => window.clearTimeout(timeoutId)
  }, [basePayload, semesters])

  useEffect(() => {
    if (!basePayload || activeId === newestId || semesterPayloads[activeId] || cachedSemester) {
      return
    }

    setSemesterPayloads((current) => ({ ...current, [activeId]: { status: 'loading' } }))
    getSemesterGrades(activeId)
      .then((data) => {
        const ok = data?.authenticated && data.grades && !data.error
        setSemesterPayloads((current) => ({
          ...current,
          [activeId]: ok ? { status: 'ok', payload: data.grades } : { status: 'error', error: describeLoadError(data, null) },
        }))
      })
      .catch((error) => {
        setSemesterPayloads((current) => ({ ...current, [activeId]: { status: 'error', error: describeLoadError(null, error) } }))
      })
  }, [activeId, basePayload, cachedSemester, newestId, semesterPayloads])

  const config = activeEntry.payload?.config ?? basePayload?.config ?? null
  const releve = activeEntry.payload?.['relevé'] ?? null
  const report = useMemo(() => (releve ? buildGradesReport(releve, { config }) : null), [releve, config])
  const absences = useMemo(
    () => (releve ? buildAbsenceReport(activeEntry.payload, releve, config) : { visible: false }),
    [activeEntry.payload, releve, config],
  )
  const department = releve ? getReleveDepartment(releve) : null
  const isReportReady = report?.status === 'ok'

  // "New" is decided once per semester per visit, then everything shown
  // counts as seen for next time.
  useEffect(() => {
    if (!isReportReady || activeId in newIdsBySemester) {
      return
    }

    const seen = readSeenGrades(storageScope)
    setNewIdsBySemester((current) => ({ ...current, [activeId]: findNewGrades(report, seen[activeId] ?? null) }))
    writeSeenGrades(storageScope, { ...seen, [activeId]: listGradeSignatures(report) })
  }, [activeId, isReportReady, newIdsBySemester, report, storageScope])

  useEffect(() => {
    if (!department || department in departmentMessages) {
      return
    }

    setDepartmentMessages((current) => ({ ...current, [department]: null }))
    getGradesDepartmentMessage(department)
      .then((data) => {
        const text = htmlToPlainText(data?.message)
        if (text) setDepartmentMessages((current) => ({ ...current, [department]: text }))
      })
      .catch(() => {})
  }, [department, departmentMessages])

  const projection = useMemo(
    () => (simulating && releve && isReportReady ? projectAverages(releve, overrides) : null),
    [isReportReady, overrides, releve, simulating],
  )
  const newIds = newIdsBySemester[activeId] ?? new Set()
  const canSimulate = isReportReady && [...report.resources, ...report.saes]
    .some((module) => module.evaluations.some((evaluation) => evaluation.canSimulate))

  const handleSelectSemester = useCallback((id) => {
    setSelectedId(id)
    setKindFilter('all')
    setUeFilter(null)
    setOpenIds(new Set())
    setOverrides({})
    setSimulating(false)
  }, [])

  const handleRetry = useCallback(() => {
    if (base.status === 'error') {
      setBase({ status: 'loading', payload: null, error: null })
      setReloadNonce((current) => current + 1)
      return
    }

    setSemesterPayloads((current) => {
      const next = { ...current }
      delete next[activeId]
      return next
    })
  }, [activeId, base.status])

  const openModule = useCallback((code) => {
    const module = [...(report?.resources ?? []), ...(report?.saes ?? [])].find((entry) => entry.code === code)
    if (!module) return
    setKindFilter('all')
    setUeFilter(null)
    setOpenIds((current) => new Set(current).add(module.id))
    revealModule(code)
  }, [report])

  const showUeGrades = useCallback((ueCode) => {
    setKindFilter('all')
    setUeFilter(ueCode)
    window.requestAnimationFrame(() => {
      document.getElementById('grades-modules')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])

  const startSimulation = useCallback(() => {
    setSimulating(true)
    // Open the modules that still wait for a grade: that's where input goes.
    const waiting = [...(report?.resources ?? []), ...(report?.saes ?? [])]
      .filter((module) => module.evaluations.some((evaluation) => evaluation.canSimulate && evaluation.grade.kind !== 'number'))
    if (waiting.length) {
      setOpenIds((current) => {
        const next = new Set(current)
        for (const module of waiting) next.add(module.id)
        return next
      })
    }
  }, [report])

  const resetSimulation = useCallback(() => {
    setOverrides({})
    setSimulationNonce((current) => current + 1)
  }, [])

  const stopSimulation = useCallback(() => {
    setSimulating(false)
    resetSimulation()
  }, [resetSimulation])

  const setOverride = useCallback((id, value) => {
    setOverrides((current) => {
      const next = { ...current }
      if (value == null) delete next[id]
      else next[id] = value
      return next
    })
  }, [])

  const activeSemester = semesters.find((semester) => semester.id === activeId) ?? null
  const departmentMessage = department ? departmentMessages[department] : null
  const showPdf = isReportReady && activeId !== 'current' && canDownloadReportPdf(config, department)
  const subtitle = isReportReady
    ? [report.formation.acronym, report.semester.year, report.semester.groups.join(', ')].filter(Boolean).join(' · ')
    : [activeSemester?.title, activeSemester?.year].filter(Boolean).join(' · ')
  const semesterOptions = semesters.map((semester) => ({
    value: semester.id,
    label: semester.number != null ? `S${semester.number}` : semester.title ?? 'Semestre',
    detail: semester.year,
  }))

  const retryButton = (
    <button type="button" onClick={handleRetry} className="rounded-full border-0 bg-brand px-4 py-2 font-body text-[14px] font-semibold text-bg hover:bg-brand-hover">
      Réessayer
    </button>
  )

  let body
  if (base.status === 'loading') {
    body = <LoadingDots label="Récupération de ton relevé sur ScoDoc…" />
  } else if (base.status === 'error') {
    body = (
      <StatusMessage
        icon="carbon:cloud-offline"
        title="Notes indisponibles"
        detail={base.error}
        action={<div className="flex flex-wrap gap-2">{retryButton}<OpenScodocButton /></div>}
      />
    )
  } else if (activeEntry.status === 'loading') {
    body = <LoadingDots label={`Chargement du ${activeSemester?.number != null ? `semestre ${activeSemester.number}` : 'semestre'}…`} />
  } else if (activeEntry.status === 'error') {
    body = (
      <StatusMessage
        icon="carbon:cloud-offline"
        title="Ce semestre n'a pas pu être chargé"
        detail={activeEntry.error}
        action={<div className="flex flex-wrap gap-2">{retryButton}<OpenScodocButton /></div>}
      />
    )
  } else if (!report || report.status === 'empty') {
    body = <StatusMessage icon="carbon:document-blank" title="Aucun relevé pour ce semestre" detail="ScoDoc n'a encore rien publié ici." />
  } else if (report.status === 'unpublished') {
    body = <StatusMessage icon="carbon:view-off" title="Relevé non publié" detail={report.message} />
  } else if (report.status === 'unsupported') {
    body = (
      <StatusMessage
        icon="carbon:document-unknown"
        title={`Relevé ${report.type} non pris en charge`}
        detail="Seuls les relevés de BUT s'affichent ici pour l'instant. Ton relevé reste consultable sur ScoDoc."
        action={<OpenScodocButton />}
      />
    )
  } else {
    const recent = (() => {
      const all = [...report.resources, ...report.saes].flatMap((module) => module.evaluations
        .filter((evaluation) => evaluation.grade.kind === 'number')
        .map((evaluation) => ({ ...evaluation, moduleCode: module.code, moduleTitle: module.title })))
      const fresh = all.filter((evaluation) => newIds.has(evaluation.id))
      // New grades first (all of them), otherwise the latest few.
      return (fresh.length ? fresh : report.latest).slice().sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''))
    })()

    const ueCount = report.ues.length

    // Keyed by semester: switching replays the arrival animation.
    body = (
      <Fragment key={activeId}>
        {projection ? (
          <SimulationBar
            projection={projection}
            overrideCount={Object.keys(overrides).length}
            onReset={resetSimulation}
            onClose={stopSimulation}
          />
        ) : null}

        <OverviewCard report={report} projection={projection} revealOrder={0} />
        <RecentGrades evaluations={recent} newIds={newIds} onOpen={openModule} revealOrder={1} />

        {report.ues.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="grades-ues-title">
            <SectionTitle id="grades-ues-title" count={report.ues.length}>Compétences (UE)</SectionTitle>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-x-3 gap-y-3 max-md:grid-cols-1">
              {report.ues.map((ue, index) => (
                <UeCard
                  key={ue.code}
                  revealOrder={2 + index}
                  ue={ue}
                  projected={projection?.ues[ue.code]?.projected ?? null}
                  showPromoStats={report.showPromoStats}
                  onShowGrades={showUeGrades}
                />
              ))}
            </div>
          </section>
        ) : null}

        <ModulesSection
          revealOrder={2 + ueCount}
          report={report}
          kindFilter={kindFilter}
          onKindFilterChange={setKindFilter}
          ueFilter={ueFilter}
          onUeFilterChange={setUeFilter}
          openIds={openIds}
          onOpenIdsChange={setOpenIds}
          newIds={newIds}
          simulation={{ active: simulating, overrides, setOverride, nonce: simulationNonce }}
        />

        <AbsencesSection absences={absences} revealOrder={3 + ueCount} />

        {report.appreciations.length ? (
          <section className="flex flex-col gap-3" aria-labelledby="grades-appreciations-title">
            <SectionTitle id="grades-appreciations-title">Appréciations</SectionTitle>
            <div style={revealStyle(4 + ueCount)} className={`${CARD_CLASSES} grades-reveal flex flex-col gap-3 p-4`}>
              {report.appreciations.map((text) => (
                <p key={text} className="m-0 font-body text-[15px] leading-relaxed text-text whitespace-pre-line">{text}</p>
              ))}
            </div>
          </section>
        ) : null}

        <p className="m-0 font-body text-[12px] leading-relaxed text-text-muted">
          Relevé provisoire fourni par ScoDoc à titre informatif, sans valeur officielle.
          {report.publishedAt ? ` Mis à jour le ${formatLongDate(report.publishedAt)}.` : ''}
          {projection ? ' Les moyennes simulées sont une estimation calculée par Tafac.' : ''}
        </p>
      </Fragment>
    )
  }

  return (
    <section className={`grades-page w-full pt-4 px-6 pb-10 4xl:pt-5 max-md:px-3 max-md:pt-3 ${simulating ? 'max-4xl:pb-36' : ''}`} aria-labelledby="grades-page-title">
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-8 max-md:gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div className="flex flex-col gap-1 min-w-0">
              <h1 id="grades-page-title" className="m-0 text-[36px] leading-none tracking-[-0.02em] max-md:text-[30px]">Mes notes</h1>
              {subtitle ? <p className="m-0 font-body text-[15px] font-medium text-text-secondary">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {canSimulate ? (
                <button
                  type="button"
                  aria-pressed={simulating}
                  onClick={simulating ? stopSimulation : startSimulation}
                  className={simulating
                    ? 'inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand px-3.5 py-2 font-body text-[14px] font-semibold text-bg'
                    : SECONDARY_BUTTON}
                >
                  <Icon icon="carbon:calculator" className="size-4" aria-hidden="true" />
                  Simuler
                </button>
              ) : null}
              {showPdf ? (
                <a href={getGradesReportPdfHref(activeId, releve?.type)} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
                  <Icon icon="carbon:document-pdf" className="size-4" aria-hidden="true" />
                  PDF
                </a>
              ) : null}
              {base.status === 'ok' ? <OpenScodocButton /> : null}
            </div>
          </div>
          {semesterOptions.length > 1 ? (
            <div className="-mx-6 overflow-x-auto px-6 py-1 [scrollbar-width:none] max-md:-mx-3 max-md:px-3">
              <SegmentedControl label="Semestre" options={semesterOptions} value={activeId} onChange={handleSelectSemester} size="lg" />
            </div>
          ) : null}
        </header>

        {departmentMessage && isReportReady ? (
          <aside className={`${CARD_CLASSES} grades-reveal flex gap-3 p-4`} aria-label="Message du département">
            <Icon icon="carbon:information" className="mt-0.5 size-5 shrink-0 text-text-secondary" aria-hidden="true" />
            <div className="flex flex-col gap-1 min-w-0">
              <p className="m-0 font-body text-[14px] font-semibold text-text">Message de ton département</p>
              <p className="m-0 font-body text-[14px] leading-relaxed text-text-secondary whitespace-pre-line">{departmentMessage}</p>
            </div>
          </aside>
        ) : null}

        {body}
      </div>
    </section>
  )
}

export default GradesPage
