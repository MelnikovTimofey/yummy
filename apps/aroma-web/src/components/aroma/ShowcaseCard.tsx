import { useState } from "react";
import { cn } from "@/lib/utils";
import { getProfileColor } from "@/lib/profile-color";
import { mixPhotoSrc, pickMixPhoto } from "@/lib/mix-photo";
import { ProfileGlyph } from "./ProfileGlyph";
import { RatingPill } from "./RatingPill";
import { SignatureBar } from "./SignatureBar";

type ShowcaseCardProps = {
  mix: { id: string; name: string; flavors: string[]; flavorProfiles: string[]; ratingsCount: number; avgRating: number };
  onClick: () => void;
};

// Постер полки Витрины (#614, вариант A): 236×150, около полутора на экран, под
// названием — вкусы. С фото вкуса (#592) фото на всю карточку, затемнение снизу
// под текст, подкраски профилями и глифа нет. Без фото или если файл не
// загрузился — глиф и пятна цветов профиля. Фото размера sheet: прежний poster (312×184)
// на ретине для такой карточки мыльный.
export function ShowcaseCard({ mix, onClick }: ShowcaseCardProps) {
  const photo = pickMixPhoto(mix);
  const src = photo ? mixPhotoSrc(photo, "sheet") : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const withPhoto = src !== null && failedSrc !== src;
  const [firstProfile, secondProfile = firstProfile] = mix.flavorProfiles;

  return (
    <button
      type="button"
      className={cn("aroma-showcase-card", withPhoto && "aroma-showcase-card-photo")}
      onClick={onClick}
      style={
        withPhoto
          ? undefined
          : {
              background: `radial-gradient(circle at 88% 0%, ${getProfileColor(firstProfile)}8c 0%, transparent 62%), radial-gradient(circle at 0% 100%, ${getProfileColor(secondProfile)}4d 0%, transparent 58%), var(--guest-card-bg)`,
            }
      }
    >
      {withPhoto ? (
        <img
          className="aroma-showcase-card-img"
          src={src}
          alt=""
          width={236}
          height={150}
          loading="lazy"
          decoding="async"
          onError={() => setFailedSrc(src)}
        />
      ) : null}
      <span className="aroma-showcase-card-top">
        {withPhoto ? <span /> : <ProfileGlyph profiles={mix.flavorProfiles} size={36} />}
        {mix.ratingsCount > 0 ? <RatingPill rating={mix.avgRating} style={{ padding: "2px 7px", fontSize: 10.5 }} /> : null}
      </span>
      <span className="aroma-showcase-card-bottom">
        <span className="aroma-showcase-card-name">{mix.name}</span>
        {mix.flavors.length ? <span className="aroma-showcase-card-flavors">{mix.flavors.slice(0, 3).join(", ")}</span> : null}
      </span>
      <span className="aroma-showcase-card-signature">
        <SignatureBar profiles={mix.flavorProfiles} height={2} />
      </span>
    </button>
  );
}
