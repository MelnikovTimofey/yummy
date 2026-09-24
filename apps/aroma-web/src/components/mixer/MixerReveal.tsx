import { useLayoutEffect, useRef } from 'react';

import { CTA, RatingPill } from '@/components/aroma';
import { hintText, verdictLabel } from '@/lib/mixer/copy';
import type { Evaluation, PaletteTobacco } from '@/lib/mixer/types';
import { BowlRing } from './BowlRing';
import { ProportionSplit } from './ProportionSplit';

const NAME_MAX_LENGTH = 80;

const CHARACTER_AXES = [
  { key: 'sweet', label: 'Сладость' },
  { key: 'sour', label: 'Кислинка' },
  { key: 'fresh', label: 'Свежесть' },
  { key: 'dense', label: 'Плотность' },
] as const;

// Имя не обрезается: многострочное поле растёт по высоте вместе с текстом,
// горизонтальной прокрутки нет. Перенос строки Enter не вставляет — имя одно.
function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const field = ref.current;
    if (!field) return;
    const fit = () => {
      field.style.height = 'auto';
      field.style.height = `${field.scrollHeight + field.offsetHeight - field.clientHeight}px`;
    };
    fit();
    // Высота зависит от гарнитуры и ширины: Literata может догрузиться позже.
    void document.fonts?.ready.then(fit);
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [value]);

  return (
    <label className="mixer-name-field">
      <span className="aroma-caps">Название · можно переименовать</span>
      <textarea
        ref={ref}
        className="mixer-name-input"
        rows={1}
        value={value}
        maxLength={NAME_MAX_LENGTH}
        aria-label="Название микса"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value.replace(/\s*\n\s*/g, ' '))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

export function MixerReveal({
  tobaccos,
  shares,
  evaluation,
  evaluationFailed,
  name,
  canOpenMix,
  onRename,
  onSharesChange,
  onSharesCommit,
  onOpenMix,
}: {
  tobaccos: PaletteTobacco[];
  shares: number[];
  evaluation: Evaluation | null;
  evaluationFailed: boolean;
  name: string;
  canOpenMix: (mixId: string) => boolean;
  onRename: (name: string) => void;
  onSharesChange: (shares: number[]) => void;
  onSharesCommit: (shares: number[]) => void;
  onOpenMix: (mixId: string) => void;
}) {
  const similar = evaluation?.similarMix ?? null;

  return (
    <>
      <div className="mixer-reveal-card">
        <div className="mixer-reveal-head">
          <BowlRing
            tobaccos={tobaccos}
            shares={shares}
            quick
            center={
              evaluation ? (
                <span className="mixer-ring-score">{evaluation.harmony}</span>
              ) : (
                <span className="mixer-ring-caption">{evaluationFailed ? '—' : 'Считаем…'}</span>
              )
            }
          />
          <div className="mixer-reveal-verdict">
            <span className="aroma-caps">Ваш микс · гармония</span>
            {evaluation ? (
              <span className="mixer-verdict">{`${verdictLabel(evaluation.verdict)} · ${evaluation.harmony}`}</span>
            ) : (
              <span className="mixer-reveal-pending">
                {evaluationFailed ? 'Оценка не загрузилась. Покурить можно и так.' : 'Считаем гармонию…'}
              </span>
            )}
          </div>
        </div>
        <NameField value={name} onChange={onRename} />
      </div>

      {tobaccos.length > 1 ? (
        <ProportionSplit
          tobaccos={tobaccos}
          shares={shares}
          onChange={onSharesChange}
          onCommit={onSharesCommit}
        />
      ) : null}

      {evaluation ? (
        <div className="mixer-meters">
          {CHARACTER_AXES.map((axis) => (
            <div key={axis.key} className="mixer-meter">
              <span className="mixer-meter-label">{axis.label}</span>
              <span className="mixer-meter-track">
                <span style={{ width: `${Math.round(evaluation.character[axis.key] * 100)}%` }} />
              </span>
            </div>
          ))}
          {evaluation.hints.map((hint) => (
            <p key={hint.kind} className="mixer-hint">
              {hintText(hint)}
            </p>
          ))}
        </div>
      ) : null}

      {evaluation ? (
        similar ? (
          canOpenMix(similar.id) ? (
            <button type="button" className="mixer-similar" onClick={() => onOpenMix(similar.id)}>
              <span className="aroma-caps">В ателье похоже</span>
              <strong>{similar.name}</strong>
              <RatingPill rating={similar.avgRating} />
              <span className="mixer-similar-note">{`Совпадение ${similar.similarity}% · открыть микс мастера`}</span>
            </button>
          ) : (
            <div className="mixer-similar">
              <span className="aroma-caps">В ателье похоже</span>
              <strong>{similar.name}</strong>
              <RatingPill rating={similar.avgRating} />
              <span className="mixer-similar-note">{`Совпадение ${similar.similarity}%`}</span>
            </div>
          )
        ) : (
          <div className="mixer-similar">
            <span className="aroma-caps">В ателье такого нет</span>
            <strong>Первое такое сочетание</strong>
            <span />
            <span className="mixer-similar-note">Похожих миксов в каталоге нет.</span>
          </div>
        )
      ) : null}
    </>
  );
}

export function MixerRevealDock({
  smoking,
  onSmoke,
  onRestart,
}: {
  smoking: boolean;
  onSmoke: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="mixer-dock">
      <CTA pulse={!smoking} disabled={smoking} onClick={onSmoke}>
        {smoking ? 'Отмечаем…' : 'Покурить'}
      </CTA>
      <button type="button" className="mixer-link" onClick={onRestart}>
        Собрать заново
      </button>
    </div>
  );
}
