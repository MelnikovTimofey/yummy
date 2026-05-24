import { getProfileColor } from "@/lib/profile-color";

type ProfileGlyphProps = {
  profiles: string[];
  size?: number;
};

const POSITIONS = [
  { left: 8, top: 8, s: 26, o: 0.92 },
  { left: 22, top: 22, s: 24, o: 0.78 },
  { left: 14, top: 28, s: 18, o: 0.62 },
] as const;

export function ProfileGlyph({ profiles, size = 56 }: ProfileGlyphProps) {
  const list = profiles.slice(0, 3);
  const scale = size / 56;
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background:
          "radial-gradient(circle at 30% 30%, rgba(255,244,236,0.04), transparent 70%), rgba(20,10,10,0.5)",
        border: "1px solid var(--line-soft)",
        position: "relative",
        flex: "0 0 auto",
        overflow: "hidden",
      }}
    >
      {list.map((profileId, i) => {
        const color = getProfileColor(profileId);
        const pos = POSITIONS[i] ?? POSITIONS[0];
        return (
          <span
            key={`${profileId}-${i}`}
            style={{
              position: "absolute",
              left: pos.left * scale,
              top: pos.top * scale,
              width: pos.s * scale,
              height: pos.s * scale,
              borderRadius: 999,
              background: `radial-gradient(circle at 30% 30%, ${color} 0%, ${color}66 70%, transparent 100%)`,
              opacity: pos.o,
              mixBlendMode: "screen",
              filter: "blur(2px)",
            }}
          />
        );
      })}
    </div>
  );
}
