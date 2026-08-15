// Back arrow + oxblood progress bar + "1/2" counter, pinned in the guest topbar.
export function OnboardingProgress({ step = 1, total = 2, onBack, style }) {
  const percent = Math.round((step / total) * 100);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 12, paddingTop: 4, ...style }}>
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад"
        style={{ width: 36, height: 36, borderRadius: 'var(--r-pill)', border: '1px solid var(--border-subtle)', background: 'var(--guest-control-bg-soft)', color: 'var(--text-primary)', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}
      >
        ←
      </button>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} style={{ height: 4, borderRadius: 'var(--r-pill)', background: 'rgba(150,148,142,0.16)', overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', borderRadius: 'inherit', width: percent + '%', background: 'linear-gradient(90deg, var(--accent-deep) 0%, var(--accent) 100%)', transition: 'width var(--dur-slow) var(--ease-out)' }} />
      </div>
      <span className="aroma-caps" style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--text-secondary)' }}>{step + '/' + total}</span>
    </div>
  );
}
