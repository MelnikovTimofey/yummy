// Poster in a Витрина shelf (#175): glyph + rating on top, serif name below, signature along the bottom edge.
import { ProfileGlyph } from './ProfileGlyph.jsx';
import { SignatureBar } from './SignatureBar.jsx';
import { RatingPill } from './RatingPill.jsx';

const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };
const tint = (profile, share) => 'color-mix(in srgb, ' + (PROFILE_COLORS[profile] || 'var(--profile-fallback)') + ' ' + share + '%, transparent)';

export function ShowcaseCard({ name, profiles = [], rating, onClick, style }) {
  const [first, second = first] = profiles;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: 'relative',
        flex: '0 0 auto',
        width: 156,
        height: 92,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '9px 10px 10px',
        borderRadius: 'var(--r-guest-card)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-guest-scroll-card)',
        color: 'var(--text-primary)',
        textAlign: 'left',
        cursor: 'pointer',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        // Darkening to the bottom keeps the name readable over the profile tints.
        background:
          'linear-gradient(180deg, transparent 35%, rgba(15,15,18,0.55) 100%), radial-gradient(circle at 88% 0%, ' + tint(first, 55) + ' 0%, transparent 62%), radial-gradient(circle at 0% 100%, ' + tint(second, 30) + ' 0%, transparent 58%), var(--guest-card-bg)',
        ...style,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
        <ProfileGlyph profiles={profiles} size={28} />
        {rating != null ? <RatingPill rating={rating} style={{ padding: '2px 7px', fontSize: 10.5 }} /> : null}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14.5, lineHeight: 1.15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{name}</span>
      <span style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <SignatureBar profiles={profiles} height={2} />
      </span>
    </button>
  );
}
