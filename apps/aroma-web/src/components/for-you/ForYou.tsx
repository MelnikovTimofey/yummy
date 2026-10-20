import { ChevronLeft, ChevronRight } from 'lucide-react';

import { CTA, ProfileGlyph, SignatureBar } from '@/components/aroma';
import { getProfileColor } from '@/lib/profile-color';
import {
  BACK_TO_FOR_YOU,
  FOR_YOU_SUBTITLE,
  FOR_YOU_TITLE,
  HINT_TITLE,
  MOOD_LINK,
  type ForYouRow,
  type ForYouSlots,
} from '@/lib/for-you-copy';

type ForYouMix = {
  id: string;
  name: string;
  flavorProfiles: string[];
  components: Array<{ id: string; name: string; manufacturer: string; proportion: number }>;
};

// «Подобрать под настроение» — тихая ссылка, а не кнопка: главное действие на
// Подборе остаётся одно, «Покурить».
export function MoodLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fy-mood-link" onClick={onClick}>
      <span>{MOOD_LINK}</span>
      <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

export function BackToForYou({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fy-mood-link" onClick={onClick}>
      <ChevronLeft size={18} strokeWidth={1.8} aria-hidden />
      <span>{BACK_TO_FOR_YOU}</span>
    </button>
  );
}

// Строка «под настроение»: надпись капсами и что из этого следует. `onBack` —
// стрелка на онбординге этого визита: к первому шагу или к «Для вас».
export function MoodNote({
  title,
  text,
  onBack,
  backLabel = 'Назад к «Для вас»',
}: {
  title: string;
  text: string;
  onBack?: () => void;
  backLabel?: string;
}) {
  return (
    <div className="fy-mood-note">
      {onBack ? (
        <button type="button" className="aroma-rail-back" onClick={onBack} aria-label={backLabel}>
          ←
        </button>
      ) : null}
      <p className="fy-mood-note-text">
        <span className="aroma-caps">{title}</span>
        {text}
      </p>
    </div>
  );
}

function ReasonRow<M extends ForYouMix>({ row, onOpen }: { row: ForYouRow<M>; onOpen: (mix: M) => void }) {
  return (
    <button type="button" className="cab-row" onClick={() => onOpen(row.mix)}>
      <ProfileGlyph profiles={row.mix.flavorProfiles} size={44} />
      <span className="cab-row-text">
        <span className="cab-row-name">{row.mix.name}</span>
        <SignatureBar profiles={row.mix.flavorProfiles} height={3} />
        <span className="cab-row-reason">{row.reason}</span>
      </span>
    </button>
  );
}

function ForYouHero<M extends ForYouMix>({
  row,
  choosing,
  chooseDisabled,
  onOpen,
  onChoose,
}: {
  row: ForYouRow<M>;
  choosing: boolean;
  chooseDisabled: boolean;
  onOpen: (mix: M) => void;
  onChoose: (mix: M) => void;
}) {
  const { mix } = row;
  const components = [...mix.components].sort((left, right) => right.proportion - left.proportion).slice(0, 4);

  return (
    <article
      className="aroma-recs-hero"
      style={{
        background: `radial-gradient(circle at 80% 0%, ${getProfileColor(mix.flavorProfiles[0])}55 0%, transparent 55%), var(--guest-card-bg)`,
      }}
    >
      <button type="button" className="aroma-recs-hero-head fy-hero-open" onClick={() => onOpen(mix)}>
        <ProfileGlyph profiles={mix.flavorProfiles} size={64} />
        <span className="aroma-recs-hero-head-text">
          <span className="aroma-recs-hero-title">{mix.name}</span>
          <span className="aroma-recs-hero-desc">{row.reason}</span>
        </span>
      </button>
      <SignatureBar profiles={mix.flavorProfiles} height={6} />
      {components.length ? (
        <div className="aroma-recs-composition">
          {components.map((component) => (
            <div className="aroma-recs-comp-row" key={component.id}>
              <span className="aroma-caps aroma-recs-comp-maker">{component.manufacturer}</span>
              <span className="aroma-recs-comp-name">{component.name}</span>
              <span className="aroma-recs-comp-share">{Math.round(component.proportion)}%</span>
            </div>
          ))}
        </div>
      ) : null}
      <CTA pulse disabled={chooseDisabled} onClick={() => onChoose(mix)}>
        {choosing ? 'Сохраняем…' : 'Покурить'}
      </CTA>
    </article>
  );
}

// «Для вас», раскладка A · по слотам (мокап fy-a, fy-a-varied).
export function ForYou<M extends ForYouMix>({
  slots,
  choosingId,
  chooseDisabled,
  onOpen,
  onChoose,
  onMood,
}: {
  slots: ForYouSlots<M>;
  choosingId: string | null;
  chooseDisabled: boolean;
  onOpen: (mix: M) => void;
  onChoose: (mix: M) => void;
  onMood: () => void;
}) {
  const { hint, hero, taste, sidestep, again } = slots;

  return (
    <section className="aroma-recs">
      <header className="fy-head">
        <h1 className="fy-title">{FOR_YOU_TITLE}</h1>
        <p className="fy-sub">{FOR_YOU_SUBTITLE}</p>
        <MoodLink onClick={onMood} />
      </header>

      {hint ? (
        <section className="fy-bubble" aria-label={HINT_TITLE}>
          <p className="aroma-caps">{HINT_TITLE}</p>
          <p className="fy-bubble-text">{hint.text}</p>
          <button type="button" className="fy-bubble-link" onClick={() => onOpen(hint.mix)}>
            <ProfileGlyph profiles={hint.mix.flavorProfiles} size={28} />
            <span className="fy-bubble-name">{hint.mix.name}</span>
            <ChevronRight size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </section>
      ) : null}

      {hero || taste.length ? <p className="aroma-caps">Новое в вашем вкусе</p> : null}
      {hero ? (
        <ForYouHero
          row={hero}
          choosing={choosingId === hero.mix.id}
          chooseDisabled={chooseDisabled}
          onOpen={onOpen}
          onChoose={onChoose}
        />
      ) : null}
      {taste.length ? (
        <div className="fy-list">
          {taste.map((row) => (
            <ReasonRow key={row.mix.id} row={row} onOpen={onOpen} />
          ))}
        </div>
      ) : null}

      {sidestep ? (
        <>
          <p className="aroma-caps">Шаг в сторону</p>
          <ReasonRow row={sidestep} onOpen={onOpen} />
        </>
      ) : null}

      {again ? (
        <>
          <p className="aroma-caps">Снова</p>
          <ReasonRow row={again} onOpen={onOpen} />
        </>
      ) : null}
    </section>
  );
}
