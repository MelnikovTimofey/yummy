import { ProfileGlyph, SignatureBar } from '@/components/aroma';
import './mixer.css';

export type MasterCardComponent = { id: string; manufacturer: string; name: string; proportion: number };
export type MixerSmoke = { name: string; profiles: string[]; components: MasterCardComponent[]; harmony: number | null };

// Карточка для мастера после «Покурить» — в той же подаче, что у миксов
// каталога, плюс пометка «Собран гостем». Её же открывает собранный микс из
// кабинета (#244). Компоненты — в порядке чаши: основа, акцент, штрих.
export function MixerMasterCard({
  name,
  profiles,
  components,
  harmony,
  footnote,
  onDone,
}: {
  name: string;
  profiles: string[];
  components: MasterCardComponent[];
  harmony: number | null;
  footnote: string | null;
  onDone: () => void;
}) {

  return (
    <section className="aroma-smoke-confirmation mixer-master-card">
      <div className="aroma-smoke-confirmation-topbar">
        <p className="aroma-smoke-confirmation-note">Покажите мастеру</p>
        <button type="button" className="aroma-smoke-confirmation-done" onClick={onDone}>
          Готово
        </button>
      </div>

      <div className="aroma-smoke-confirmation-stack">
        <ProfileGlyph profiles={profiles} size={96} />
        <h1 className="mixer-master-card-title" data-long={name.length > 36 ? 'true' : undefined}>
          {name}
        </h1>
        <p className="aroma-smoke-confirmation-profiles">
          {harmony === null ? 'Собран гостем' : `Собран гостем, гармония ${harmony}`}
        </p>
        <SignatureBar profiles={profiles} height={3} />
      </div>

      <section className="aroma-smoke-confirmation-composition" aria-label="Состав">
        <ul className="aroma-mix-sheet-comp-list">
          {components.map((component, index) => (
            <li key={component.id} className="aroma-mix-sheet-comp-row">
              <span
                className="aroma-mix-sheet-comp-dot"
                style={{ background: `var(--composition-${index + 1})` }}
                aria-hidden
              />
              <span className="aroma-mix-sheet-comp-maker">{component.manufacturer}</span>
              <span className="aroma-mix-sheet-comp-name">{component.name}</span>
              <span className="aroma-mix-sheet-comp-share">{`${component.proportion}%`}</span>
            </li>
          ))}
        </ul>
      </section>

      {footnote ? <p className="mixer-master-card-note">{footnote}</p> : null}
    </section>
  );
}
