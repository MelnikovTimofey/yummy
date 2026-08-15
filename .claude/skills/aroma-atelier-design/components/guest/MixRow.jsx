// Mix list row: optional glyph, name + signature + flavour line, rating on the right.
import { ProfileGlyph } from './ProfileGlyph.jsx';
import { SignatureBar } from './SignatureBar.jsx';
import { RatingPill } from './RatingPill.jsx';

export function MixRow({ name, flavors = [], profiles = [], rating, glyphSize = 44, showGlyph = true, showSignature = false, onClick, style }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: (showGlyph ? glyphSize + 'px ' : '') + 'minmax(0,1fr) auto',
        alignItems: 'center',
        gap: 10,
        padding: showGlyph ? '8px 12px' : '10px 12px',
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
      {showGlyph ? <ProfileGlyph profiles={profiles} size={glyphSize} /> : null}
      <span style={{ minWidth: 0, display: 'grid', gap: 4 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: 1.2, color: 'var(--text-primary)' }}>{name}</span>
        {showSignature ? <SignatureBar profiles={profiles} height={3} /> : null}
        {flavors.length ? (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {flavors.slice(0, 3).join(' · ')}
          </span>
        ) : null}
      </span>
      {rating != null ? <RatingPill rating={rating} /> : null}
    </button>
  );
}
