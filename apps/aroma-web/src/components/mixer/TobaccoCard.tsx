import type { CSSProperties, PointerEvent, Ref } from 'react';

import { getProfileColor } from '@/lib/profile-color';
import { profileLabelMap } from '@/lib/profile-labels';
import type { PaletteTobacco } from '@/lib/mixer/types';

export type CardPosition = 0 | 1 | 2;

export type CardMatch = { value: string; caption: string };

const profileLine = (tobacco: PaletteTobacco) =>
  tobacco.flavorProfiles
    .slice(0, 2)
    .map((profile) => profileLabelMap[profile] ?? profile)
    .join(' · ');

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

  return (
    <div
      ref={cardRef}
      className={entrance && top ? `mixer-card mixer-card-${entrance}` : 'mixer-card'}
      data-pos={position}
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
      <span className="aroma-caps mixer-card-brand">{tobacco.manufacturer}</span>
      <span className="mixer-card-name">{tobacco.name}</span>
      <span className="mixer-card-flavors">{tobacco.flavors.join(' · ')}</span>
      <div className="mixer-card-foot">
        <div className="mixer-card-match">
          <b>{match.value}</b>
          <span>{match.caption}</span>
        </div>
        {tobacco.cooling ? <span className="mixer-card-tag">холодок</span> : null}
      </div>
    </div>
  );
}
