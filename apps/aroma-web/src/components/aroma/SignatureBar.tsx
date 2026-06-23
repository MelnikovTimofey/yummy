import { getProfileColor } from "@/lib/profile-color";

type SignatureBarProps = {
  profiles: string[];
  height?: number;
  radius?: number;
};

export function SignatureBar({ profiles, height = 4, radius = 999 }: SignatureBarProps) {
  if (!profiles.length) return null;
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        width: "100%",
        height,
        borderRadius: radius,
        overflow: "hidden",
        boxShadow: "inset 0 0 0 1px rgba(255,244,236,0.04)",
      }}
    >
      {profiles.map((profileId, i) => {
        const color = getProfileColor(profileId);
        return (
          <span
            key={`${profileId}-${i}`}
            style={{
              flex: 1,
              background: `linear-gradient(90deg, ${color} 0%, ${color}aa 100%)`,
            }}
          />
        );
      })}
    </div>
  );
}
