// The app's one loading indicator: three dots pulsing in turn
// (.lent-button-dot), in the text colour of where it sits. `label` is
// announced to screen readers; pass `label={null}` when the surrounding
// element already says what's loading and the dots are only decoration.
function LoadingDots({ label = 'Chargement', className = '' }) {
  const a11y = label
    ? { role: 'status', 'aria-live': 'polite', 'aria-label': label }
    : { 'aria-hidden': true }

  return (
    <span className={`inline-flex items-center justify-center gap-[6px] ${className}`} {...a11y}>
      <span className="lent-button-dot h-[5px] w-[5px] rounded-full bg-current" style={{ animationDelay: '0ms' }} />
      <span className="lent-button-dot h-[5px] w-[5px] rounded-full bg-current" style={{ animationDelay: '140ms' }} />
      <span className="lent-button-dot h-[5px] w-[5px] rounded-full bg-current" style={{ animationDelay: '280ms' }} />
    </span>
  )
}

export default LoadingDots
