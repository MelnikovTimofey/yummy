import { useState, type CSSProperties, type PointerEvent, type Ref } from 'react';

import { mixPhotoSrc, pickMixPhoto } from '@/lib/mix-photo';
import { getProfileColor } from '@/lib/profile-color';
import { profileLabelMap } from '@/lib/profile-labels';
import type { PaletteTobacco } from '@/lib/mixer/types';

export type CardPosition = 0 | 1 | 2;

export type CardMatch = { value: string | null; caption: string };

const profileLine = (tobacco: PaletteTobacco) =>
  tobacco.flavorProfiles
    .slice(0, 2)
    .map((profile, index) => {
      const label = profileLabelMap[profile] ?? profile;
      return index ? label.toLowerCase() : label;
    })
    .join(', ');

export function TobaccoCard({
  tobacco,
  position,
  match,
  entrance,
  cardRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: {
  tobacco: PaletteTobacco;
  position: CardPosition;
  match: CardMatch;
  entrance?: 'enter' | 'rewind';
  cardRef?: Ref<HTMLDivElement>;
  onPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLDivElement>) => void;
}) {
  const top = position === 0;
  const color = getProfileColor(tobacco.flavorProfiles[0]);
  // Фото вкуса табака (#611) по тем же правилам, что у миксов; вертикальное, на всю карту.
  // Не загрузилось — карта без фото, как раньше.
  const photo = pickMixPhoto(tobacco);
  const src = photo ? mixPhotoSrc(photo, 'reel') : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const withPhoto = Boolean(src) && failedSrc !== src;

  return (
    <div
      ref={cardRef}
      className={entrance && top ? `mixer-card mixer-card-${entrance}` : 'mixer-card'}
      data-pos={position}
      data-photo={withPhoto ? '' : undefined}
      style={{ '--pc': color } as CSSProperties}
      {...(top
        ? {
            role: 'group',
            'aria-roledescription': 'карта табака',
            'aria-label': `${tobacco.manufacturer} ${tobacco.name}`.trim(),
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel,
          }
        : { 'aria-hidden': true })}
    >
      {src && withPhoto ? (
        <>
          <img className="mixer-card-photo" src={src} alt="" draggable={false} onError={() => setFailedSrc(src)} />
          <span className="mixer-card-scrim" aria-hidden />
        </>
      ) : null}
      {top ? (
        <>
          <span className="mixer-stamp mixer-stamp-take" aria-hidden>
            Беру
          </span>
          <span className="mixer-stamp mixer-stamp-skip" aria-hidden>
            Дальше
          </span>
        </>
      ) : null}
      <span className="mixer-card-profile">
        <span className="mixer-dot" style={{ background: color }} aria-hidden />
        {profileLine(tobacco)}
      </span>
      <span className="mixer-card-brand">{tobacco.manufacturer}</span>
      <span className="mixer-card-name">{tobacco.name}</span>
      <span className="mixer-card-flavors">{tobacco.flavors.join(', ')}</span>
      <div className="mixer-card-foot">
        {match.value ? (
          <div className="mixer-card-match">
            <b>{match.value}</b>
            <span>{match.caption}</span>
          </div>
        ) : (
          <span className="mixer-card-caption">{match.caption}</span>
        )}
        {tobacco.cooling ? <span className="mixer-card-tag">холодок</span> : null}
      </div>
    </div>
  );
}
