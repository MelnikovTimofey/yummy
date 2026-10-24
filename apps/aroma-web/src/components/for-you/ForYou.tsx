import type { ReactNode } from 'react';
import { CTA, MixListRow, ProfileGlyph, SignatureBar } from '@/components/aroma';
import {
  FOR_YOU_TITLE,
  MOOD_TITLE,
  type ForYouRow,
  type ForYouSlots,
  type RecsTab,
} from '@/lib/for-you-copy';
import { cn } from '@/lib/utils';

type ForYouMix = {
  id: string;
  name: string;
  flavorProfiles: string[];
  components: Array<{ id: string; name: string; manufacturer: string; proportion: number }>;
};

const TABS: Array<{ value: RecsTab; label: string }> = [
  { value: 'for-you', label: FOR_YOU_TITLE },
  { value: 'mood', label: MOOD_TITLE },
];

// Подбор вошедшего — две вкладки вместо заголовка (#388): режим виден всегда, а
// главное действие на экране остаётся одно, «Покурить». h1 — для скринридера.
export function RecsTabs({ value, onChange }: { value: RecsTab; onChange: (tab: RecsTab) => void }) {
  return (
    <>
      <h1 className="sr-only">{value === 'mood' ? MOOD_TITLE : FOR_YOU_TITLE}</h1>
      <div className="fy-tabs" role="tablist" aria-label="Подбор">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={value === tab.value}
            className={cn('tab', value === tab.value && 'active')}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}

function ReasonRow<M extends ForYouMix>({ row, onOpen }: { row: ForYouRow<M>; onOpen: (mix: M) => void }) {
  return (
    <MixListRow
      profiles={row.mix.flavorProfiles}
      name={row.mix.name}
      sub={row.reason}
      onClick={() => onOpen(row.mix)}
    />
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
      <CTA busy={choosing} disabled={chooseDisabled} onClick={() => onChoose(mix)}>
        Покурить
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
  tabs,
}: {
  slots: ForYouSlots<M>;
  choosingId: string | null;
  chooseDisabled: boolean;
  onOpen: (mix: M) => void;
  onChoose: (mix: M) => void;
  tabs: ReactNode;
}) {
  const { hint, hero, taste, sidestep, again } = slots;

  return (
    <section className="aroma-recs">
      {tabs}

      {hint ? (
        <button type="button" className="mix-row" onClick={() => onOpen(hint.mix)}>
          <ProfileGlyph profiles={hint.mix.flavorProfiles} size={44} />
          <span className="mix-row-text">
            <span className="mix-row-sub">{hint.text}</span>
            <span className="mix-row-name">{hint.mix.name}</span>
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
