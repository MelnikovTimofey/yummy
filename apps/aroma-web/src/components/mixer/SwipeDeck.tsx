import { useImperativeHandle, useRef, type PointerEvent, type ReactNode, type Ref } from 'react';

import type { PaletteTobacco } from '@/lib/mixer/types';
import { TobaccoCard, type CardMatch, type CardPosition } from './TobaccoCard';

export type SwipeDeckHandle = {
  topRect: () => DOMRect | null;
  deckRect: () => DOMRect | null;
  flyToBowl: (ring: DOMRect) => void;
  flyLeft: () => void;
};

// Порог свайпа и возврат карты — 240 мс без пружины (дизайн-система).
export const SWIPE_THRESHOLD = 90;
const EASE = 'cubic-bezier(.4,0,.2,1)';
// Нижний отступ стопки, в который выглядывают две нижние карты.
const STACK_INSET = 16;

type Drag = { pointerId: number; x: number; y: number; dx: number };

export function SwipeDeck({
  ref,
  cards,
  version,
  entrance,
  matchFor,
  busy,
  empty,
  onSwipeRight,
  onSwipeLeft,
}: {
  ref: Ref<SwipeDeckHandle>;
  cards: PaletteTobacco[];
  // Меняется на каждое изменение стопки: верхняя карта входит заново.
  version: number;
  entrance: 'enter' | 'rewind';
  matchFor: (tobacco: PaletteTobacco) => CardMatch;
  busy: boolean;
  empty: ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  const deckRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const stamp = (kind: 'take' | 'skip') =>
    topRef.current?.querySelector<HTMLElement>(`.mixer-stamp-${kind}`) ?? null;

  const setStamps = (take: number, skip: number) => {
    const takeStamp = stamp('take');
    const skipStamp = stamp('skip');
    if (takeStamp) takeStamp.style.opacity = String(take);
    if (skipStamp) skipStamp.style.opacity = String(skip);
  };

  useImperativeHandle(ref, () => ({
    topRect: () => topRef.current?.getBoundingClientRect() ?? null,
    deckRect: () => deckRef.current?.getBoundingClientRect() ?? null,
    flyToBowl: (ring) => {
      const card = topRef.current;
      const deck = deckRef.current?.getBoundingClientRect();
      if (!card || !deck) return;
      setStamps(1, 0);
      const tx = ring.left + ring.width / 2 - (deck.left + deck.width / 2);
      const ty = ring.top + ring.height / 2 - (deck.top + (deck.height - STACK_INSET) / 2);
      card.style.animation = 'none';
      card.style.transition = `transform 460ms ${EASE}, opacity 460ms ease`;
      card.style.transform = `translate(${tx}px, ${ty}px) rotate(8deg) scale(.18)`;
      card.style.opacity = '0';
    },
    flyLeft: () => {
      const card = topRef.current;
      if (!card) return;
      setStamps(0, 1);
      card.style.animation = 'none';
      card.style.transition = `transform 260ms ${EASE}, opacity 260ms ease`;
      card.style.transform = 'translate(-130%, 20px) rotate(-18deg)';
      card.style.opacity = '0';
    },
  }));

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const card = event.currentTarget;
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0 };
    card.setPointerCapture(event.pointerId);
    card.dataset.dragging = 'true';
    card.style.animation = 'none';
    card.style.transition = 'none';
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    current.dx = dx;
    event.currentTarget.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${dx / 16}deg)`;
    setStamps(
      Math.max(0, Math.min(1, dx / SWIPE_THRESHOLD)),
      Math.max(0, Math.min(1, -dx / SWIPE_THRESHOLD)),
    );
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    drag.current = null;
    const card = event.currentTarget;
    delete card.dataset.dragging;
    const cancelled = event.type === 'pointercancel';
    if (!cancelled && current.dx > SWIPE_THRESHOLD) {
      onSwipeRight();
    } else if (!cancelled && current.dx < -SWIPE_THRESHOLD) {
      onSwipeLeft();
    } else {
      card.style.transition = `transform 240ms ${EASE}`;
      card.style.transform = '';
      setStamps(0, 0);
    }
  };

  const visible = cards.slice(0, 3);

  return (
    <div className="mixer-deck" ref={deckRef}>
      {visible.length ? (
        visible
          .map((tobacco, index) => (
            <TobaccoCard
              key={`${version}-${index}-${tobacco.id}`}
              tobacco={tobacco}
              position={index as CardPosition}
              match={matchFor(tobacco)}
              entrance={index === 0 ? entrance : undefined}
              cardRef={index === 0 ? topRef : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
            />
          ))
          .reverse()
      ) : (
        <div className="mixer-deck-empty">{empty}</div>
      )}
    </div>
  );
}
