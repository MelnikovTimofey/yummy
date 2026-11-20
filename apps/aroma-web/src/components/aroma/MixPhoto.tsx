import { useState } from "react";
import { mixPhotoSrc, pickMixPhoto } from "@/lib/mix-photo";
import { ProfileGlyph } from "./ProfileGlyph";

type MixPhotoProps = {
  // id и flavors микса; null — фото не положено (микс собран гостем).
  mix: { id: string; name?: string; flavors: string[] } | null;
  profiles: string[];
  size: number;
  // Над сгибом (герой Подбора): грузить сразу, без lazy.
  eager?: boolean;
};

// Фото вкуса вместо глифа (#592, канон «Фото вкусов»): вкус не узнан или файл
// не загрузился — тот же ProfileGlyph того же размера, вёрстка не двигается.
export function MixPhoto({ mix, profiles, size, eager = false }: MixPhotoProps) {
  const photo = mix ? pickMixPhoto(mix) : null;
  const src = photo ? mixPhotoSrc(photo, "132") : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <ProfileGlyph profiles={profiles} size={size} />;
  return (
    <img
      className="mix-photo"
      src={src}
      alt=""
      width={size}
      height={size}
      loading={eager ? undefined : "lazy"}
      decoding="async"
      onError={() => setFailedSrc(src)}
    />
  );
}
