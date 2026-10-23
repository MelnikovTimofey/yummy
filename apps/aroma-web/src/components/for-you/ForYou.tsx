import { CTA, ProfileGlyph, SignatureBar } from '@/components/aroma';
import {
  BACK_TO_FOR_YOU,
  FOR_YOU_TITLE,
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
      {MOOD_LINK}
    </button>
  );
}

export function BackToForYou({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="fy-mood-link" onClick={onClick}>
      {BACK_TO_FOR_YOU}
    </button>
  );
}

// Строка «под настроение»: что выбрано и что из этого следует. `onBack` —
// стрелка на онбординге этого визита: к первому шагу или к «Для вас».
export function MoodNote({
  title,
  text,
  onBack,
  backLabel = BACK_TO_FOR_YOU,
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
        <span className="fy-mood-note-title">{title}</span>
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
    <article className="aroma-recs-hero">
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
              {component.manufacturer ? (
                <span className="aroma-recs-comp-maker">{component.manufacturer}</span>
              ) : null}
              <span className="aroma-recs-comp-name">{component.name}</span>
              <span className="aroma-recs-comp-share">{Math.round(component.proportion)}%</span>
            </div>
          ))}
        </div>
      ) : null}
      <CTA disabled={chooseDisabled} onClick={() => onChoose(mix)}>
        {choosing ? 'Сохраняем…' : 'Покурить'}
      </CTA>
    </article>
  );
}

// «Для вас», раскладка A по слотам (мокап fy-a, fy-a-varied).
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
        <MoodLink onClick={onMood} />
      </header>

      {hint ? (
        <button type="button" className="cab-row" onClick={() => onOpen(hint.mix)}>
          <ProfileGlyph profiles={hint.mix.flavorProfiles} size={44} />
          <span className="cab-row-text">
            <span className="cab-row-reason">{hint.text}</span>
            <span className="cab-row-name">{hint.mix.name}</span>
          </span>
        </button>
      ) : null}

      {hero || taste.length ? <h2 className="aroma-recs-section-title">Новое в вашем вкусе</h2> : null}
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

      {/* Подсказка наверху уже ведёт на этот микс. */}
      {sidestep && !hint ? (
        <>
          <h2 className="aroma-recs-section-title">Шаг в сторону</h2>
          <ReasonRow row={sidestep} onOpen={onOpen} />
        </>
      ) : null}

      {again ? (
        <>
          <h2 className="aroma-recs-section-title">Снова</h2>
          <ReasonRow row={again} onOpen={onOpen} />
        </>
      ) : null}
    </section>
  );
}
