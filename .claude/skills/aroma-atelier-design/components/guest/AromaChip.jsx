// Guest chip / filter pill. Optional profile dot. Two tiers: sm (filters), lg (card tags).
const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };
const profileColor = (id) => PROFILE_COLORS[id] || 'var(--profile-fallback)';

export function AromaChip({ children, tier = 'sm', active = false, profile, color, onClick, disabled, type = 'button', style }) {
  const isLg = tier === 'lg';
  const dotSize = isLg ? 8 : 6;
  const baseDot = color || (profile ? profileColor(profile) : null);
  // На активной винной заливке тёмные профили (ягодный, пряный) тонут и мутнеют:
  // подмешиваем кремовый и ставим чёткое кольцо в 1px вместо размытого гало.
  const dotColor = baseDot && active ? 'color-mix(in srgb, ' + baseDot + ' 62%, #F7EFEC)' : baseDot;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        border: '1px solid ' + (active ? 'var(--guest-chip-border-on)' : 'var(--border-subtle)'),
        background: active ? 'var(--guest-chip-bg-on)' : 'var(--guest-chip-bg)',
        color: active ? 'var(--guest-chip-ink-on)' : 'var(--text-secondary)',
        borderRadius: 'var(--r-pill)',
        padding: isLg ? '10px 14px' : '7px 12px',
        fontFamily: 'var(--font-body)',
        fontSize: isLg ? 13 : 12,
        fontWeight: active ? 600 : 400,
        lineHeight: 1.1,
        cursor: onClick && !disabled ? 'pointer' : 'default',
        opacity: disabled ? 0.5 : 1,
        boxShadow: active ? 'inset 0 1px 0 rgba(255,244,240,0.18)' : 'none',
        transition: 'var(--transition-state)',
        ...style,
      }}
    >
      {dotColor ? (
        <span
          aria-hidden
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: 'var(--r-pill)',
            background: dotColor,
            flex: '0 0 auto',
            boxShadow: active ? 'inset 0 0 0 1px rgba(23,10,10,0.28)' : 'none',
          }}
        />
      ) : null}
      <span>{children}</span>
    </button>
  );
}
