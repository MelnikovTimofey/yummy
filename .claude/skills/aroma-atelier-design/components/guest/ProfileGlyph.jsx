// Abstract "smoke" mark for a mix: up to 3 blurred profile-coloured orbs, screen-blended.
const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };
const profileColor = (id) => PROFILE_COLORS[id] || 'var(--profile-fallback)';

const POSITIONS = [
  { left: 8, top: 8, s: 26, o: 0.92 },
  { left: 22, top: 22, s: 24, o: 0.78 },
  { left: 14, top: 28, s: 18, o: 0.62 },
];

export function ProfileGlyph({ profiles = [], size = 56 }) {
  const list = profiles.slice(0, 3);
  const scale = size / 56;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--r-guest-glyph)',
        background: 'radial-gradient(circle at 30% 30%, rgba(255,244,236,0.04), transparent 70%), rgba(20,10,10,0.5)',
        border: '1px solid var(--line-soft)',
        position: 'relative',
        flex: '0 0 auto',
        overflow: 'hidden',
      }}
    >
      {list.map((id, i) => {
        const pos = POSITIONS[i] || POSITIONS[0];
        const c = profileColor(id);
        return (
          <span
            key={id + '-' + i}
            style={{
              position: 'absolute',
              left: pos.left * scale,
              top: pos.top * scale,
              width: pos.s * scale,
              height: pos.s * scale,
              borderRadius: 'var(--r-pill)',
              background: 'radial-gradient(circle at 30% 30%, ' + c + ' 0%, color-mix(in srgb, ' + c + ' 40%, transparent) 70%, transparent 100%)',
              opacity: pos.o,
              mixBlendMode: 'screen',
              filter: 'blur(2px)',
            }}
          />
        );
      })}
    </div>
  );
}
