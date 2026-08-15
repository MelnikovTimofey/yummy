// Onboarding step 1: two-up grid of selectable flavour profiles.
const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };

export function ProfileCard({ label, profile, active = false, onClick, style }) {
  const base = PROFILE_COLORS[profile] || 'var(--profile-fallback)';
  const color = active ? 'color-mix(in srgb, ' + base + ' 62%, #F7EFEC)' : base;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minHeight: 52,
        padding: '8px 12px',
        borderRadius: 14,
        border: '1px solid ' + (active ? 'var(--guest-chip-border-on)' : 'var(--border-subtle)'),
        background: active ? 'var(--guest-chip-bg-on)' : 'rgba(40,40,48,0.60)',
        color: active ? 'var(--guest-chip-ink-on)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'var(--transition-state)',
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 'var(--r-pill)',
          background: color,
          flex: '0 0 auto',
          boxShadow: active ? 'inset 0 0 0 1px rgba(23,10,10,0.28)' : undefined,
        }}
      />
      <span style={{ minWidth: 0 }}>{label}</span>
    </button>
  );
}
