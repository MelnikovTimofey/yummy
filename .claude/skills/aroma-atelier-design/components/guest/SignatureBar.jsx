// Thin flavour "signature": equal segments of the mix's profile colours.
const PROFILE_COLORS = { citrus: 'var(--profile-citrus)', berry: 'var(--profile-berry)', floral_herbal: 'var(--profile-floral-herbal)', fresh: 'var(--profile-fresh)', sweet: 'var(--profile-sweet)', spicy: 'var(--profile-spicy)', dessert: 'var(--profile-dessert)', tobacco: 'var(--profile-tobacco)', minty: 'var(--profile-minty)', fruity: 'var(--profile-fruity)', perfume: 'var(--profile-perfume)', sour: 'var(--profile-sour)' };
const profileColor = (id) => PROFILE_COLORS[id] || 'var(--profile-fallback)';

export function SignatureBar({ profiles = [], height = 4, radius = 999 }) {
  if (!profiles.length) return null;
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        width: '100%',
        height,
        borderRadius: radius,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(255,244,236,0.04)',
      }}
    >
      {profiles.map((id, i) => {
        const c = profileColor(id);
        return (
          <span
            key={id + '-' + i}
            style={{ flex: 1, background: 'linear-gradient(90deg, ' + c + ' 0%, color-mix(in srgb, ' + c + ' 67%, transparent) 100%)' }}
          />
        );
      })}
    </div>
  );
}
