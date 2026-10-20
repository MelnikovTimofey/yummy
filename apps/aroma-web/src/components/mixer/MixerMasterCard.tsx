import { ProfileGlyph, SignatureBar } from '@/components/aroma';
import { ROLE_LABELS } from './ProportionSplit';
import './mixer.css';

export type MasterCardComponent = { id: string; manufacturer: string; name: string; proportion: number };

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
        <button type="button" className="aroma-smoke-confirmation-done" onClick={onDone}>
          Готово
        </button>
      </div>

      <div className="aroma-smoke-confirmation-stack">
        <p className="aroma-caps aroma-smoke-confirmation-kicker">Покажите мастеру</p>
        <ProfileGlyph profiles={profiles} size={96} />
        <h1 className="mixer-master-card-title" data-long={name.length > 36 ? 'true' : undefined}>
          {name}
        </h1>
        <span className="mixer-verdict">
          {harmony === null ? 'Собран гостем' : `Собран гостем · гармония ${harmony}`}
        </span>
        <SignatureBar profiles={profiles} height={3} />
      </div>

      <section className="aroma-smoke-confirmation-composition">
        <p className="aroma-caps">Состав</p>
        <ul className="aroma-smoke-confirmation-comp-list">
          {components.map((component, index) => (
            <li key={component.id} className="aroma-smoke-confirmation-comp-row">
              <div className="aroma-smoke-confirmation-comp-text">
                <span className="aroma-smoke-confirmation-comp-name">{component.name}</span>
                <span className="aroma-caps aroma-smoke-confirmation-comp-maker">
                  {`${component.manufacturer} · ${ROLE_LABELS[index]}`}
                </span>
              </div>
              <span className="aroma-smoke-confirmation-comp-share">{`${component.proportion}%`}</span>
            </li>
          ))}
        </ul>
      </section>

      {footnote ? <p className="mixer-master-card-note">{footnote}</p> : null}
    </section>
  );
}
