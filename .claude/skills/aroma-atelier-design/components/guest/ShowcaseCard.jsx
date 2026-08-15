// Horizontal-rail card (Витрина): glyph + rating head, serif name, signature, flavours.
import { ProfileGlyph } from './ProfileGlyph.jsx';
import { SignatureBar } from './SignatureBar.jsx';
import { RatingPill } from './RatingPill.jsx';

const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };

export function ShowcaseCard({ name, flavors = [], profiles = [], rating, onClick, style }) {
  const halo = PROFILE_COLORS[profiles[0]] || 'var(--profile-fallback)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        width: 196,
        display: 'grid',
        gap: 10,
        padding: 12,
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-guest-scroll-card)',
        color: 'var(--text-primary)',
        textAlign: 'left',
        cursor: 'pointer',
        background:
          'radial-gradient(circle at 86% 0%, color-mix(in srgb, ' + halo + ' 28%, transparent) 0%, transparent 60%), linear-gradient(180deg, rgba(40,17,17,0.96) 0%, rgba(22,11,12,0.96) 100%)',
        ...style,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <ProfileGlyph profiles={profiles} size={44} />
        {rating != null ? <RatingPill rating={rating} style={{ marginLeft: 'auto' }} /> : null}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 15.5, lineHeight: 1.1, minHeight: '2.2em', display: 'block' }}>{name}</span>
      <SignatureBar profiles={profiles} height={3} />
      {flavors.length ? (
        <span style={{ fontSize: 11, lineHeight: 1.25, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {flavors.join(' · ')}
        </span>
      ) : null}
    </button>
  );
}
