// Mix list row: glyph, name, profile bar, flavour line, rating on the right. One row for every guest list.
import { ProfileGlyph } from './ProfileGlyph.jsx';
import { SignatureBar } from './SignatureBar.jsx';
import { RatingPill } from './RatingPill.jsx';

export function MixRow({ name, flavors = [], profiles = [], rating, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '44px minmax(0,1fr) auto',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 'var(--r-guest-row)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--guest-row-bg)',
        color: 'var(--text-primary)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color var(--dur-fast), background var(--dur-fast)',
        ...style,
      }}
    >
      <ProfileGlyph profiles={profiles} size={44} />
      <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: 1.2, color: 'var(--text-primary)' }}>{name}</span>
        <SignatureBar profiles={profiles} height={3} />
        {flavors.length ? (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {flavors.slice(0, 3).join(', ')}
          </span>
        ) : null}
      </span>
      {rating != null ? <RatingPill rating={rating} /> : null}
    </button>
  );
}
