// Sticky glass topbar: brand mark, horizontal module nav, command pill, user chip, logout.
export function MasterTopBar({ items = [], active, onChange, userName = 'admin', userRole = 'admin', onSignOut, onOpenCommandPalette, markSrc, style }) {
  return (
    <header
      aria-label="Рабочие разделы Мастера"
      style={{
        position: 'sticky',
        top: 8,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '10px 16px',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--glass)',
        backdropFilter: 'blur(14px)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, paddingRight: 'var(--space-3)', borderRight: '1px solid var(--border-subtle)' }}>
        {markSrc ? <img aria-hidden alt="" src={markSrc} style={{ width: 28, height: 28, display: 'block', flexShrink: 0 }} /> : null}
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Ателье · Мастер</span>
      </div>

      <nav role="tablist" style={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => onChange && onChange(item.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid ' + (isActive ? 'var(--border-default)' : 'transparent'),
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--fs-md)',
                lineHeight: 1,
                cursor: 'pointer',
                transition: 'var(--transition-state)',
              }}
            >
              {item.icon ? <span style={{ display: 'inline-flex', opacity: isActive ? 1 : 0.7, color: isActive ? 'var(--accent)' : undefined }}>{item.icon}</span> : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {onOpenCommandPalette ? (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 8px', borderRadius: 'var(--r-pill)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
          >
            <span>Найти или сделать</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18, padding: '0 5px', borderRadius: 'var(--r-xs)', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderBottomWidth: 2, fontFamily: 'var(--font-meta)', fontSize: 10.5, fontWeight: 500, color: 'var(--text-muted)' }}>⌘K</span>
          </button>
        ) : null}

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 10px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', lineHeight: 1.15 }}>
          <span style={{ fontSize: 'var(--fs-sm)', letterSpacing: '-0.01em', color: 'var(--text-secondary)' }}>{userName}</span>
          <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{userRole}</span>
        </span>

        <button
          type="button"
          onClick={onSignOut}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 32, padding: '6px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', color: 'var(--text-primary)', fontSize: 'var(--fs-sm)', fontWeight: 600, cursor: 'pointer' }}
        >
          Выйти
        </button>
      </div>
    </header>
  );
}
