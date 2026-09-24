import { ProfileGlyph, SignatureBar } from '@/components/aroma';
import type { PaletteTobacco } from '@/lib/mixer/types';
import { ROLE_LABELS } from './ProportionSplit';

// Карточка для мастера после «Покурить» — в той же подаче, что у миксов
// каталога, плюс пометка «Собран гостем».
export function MixerMasterCard({
  name,
  tobaccos,
  shares,
  harmony,
  footnote,
  onDone,
}: {
  name: string;
  tobaccos: PaletteTobacco[];
  shares: number[];
  harmony: number | null;
  footnote: string | null;
  onDone: () => void;
}) {
  const profiles = Array.from(new Set(tobaccos.flatMap((tobacco) => tobacco.flavorProfiles))).slice(0, 3);

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
          {tobaccos.map((tobacco, index) => (
            <li key={tobacco.id} className="aroma-smoke-confirmation-comp-row">
              <div className="aroma-smoke-confirmation-comp-text">
                <span className="aroma-smoke-confirmation-comp-name">{tobacco.name}</span>
                <span className="aroma-caps aroma-smoke-confirmation-comp-maker">
                  {`${tobacco.manufacturer} · ${ROLE_LABELS[index]}`}
                </span>
              </div>
              <span className="aroma-smoke-confirmation-comp-share">{`${shares[index]}%`}</span>
            </li>
          ))}
        </ul>
      </section>

      {footnote ? <p className="mixer-master-card-note">{footnote}</p> : null}
    </section>
  );
}
