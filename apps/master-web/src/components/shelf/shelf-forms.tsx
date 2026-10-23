import { useId, useState, type FormEvent } from 'react';
import type { ShelfRow } from '@/contracts';
import { MARK_OPTIONS, defaultReceiptGrams, formatNumber, fractionGrams, leftEstimateNote, parseGrams, parseReceipt } from '@/lib/shelf';

// Формы остатка (#306): «Сколько осталось?», приход без счёта, списание.
// Одни и те же во всплывашке строки, в карточке и в шторке телефона.

export type CountInput = { fraction: number } | { grams: number };

type LeftPanelProps = {
  row: ShelfRow;
  onCount: (input: CountInput) => void;
  // «Закончился» внизу — во всплывашке строки; в карточке своя кнопка.
  onEmpty?: () => void;
  autoFocus?: boolean;
};

// «Сколько осталось?»: доля ¾ ½ ⅓ ¼ от уровня после прихода — сразу с граммами
// на кнопке — или точно в граммах (#shot=shelf-left, shelf-left-exact).
export const ShelfLeftPanel = ({ row, onCount, onEmpty, autoFocus = false }: LeftPanelProps) => {
  const [value, setValue] = useState('');
  const inputId = useId();
  const grams = parseGrams(value);
  const full = row.fullGrams;
  const note = leftEstimateNote(row);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (grams !== null) onCount({ grams });
  };

  return (
    <>
      <div className="shelf-fracs" role="group" aria-label="Сколько осталось">
        {MARK_OPTIONS.map((option, index) => {
          const optionGrams = full === null ? null : fractionGrams(full, option.value);
          return (
            <button
              key={option.label}
              type="button"
              className="shelf-frac"
              disabled={full === null}
              autoFocus={autoFocus && index === 0}
              title={`Клавиша ${index + 1}`}
              aria-label={optionGrams === null ? `Осталось ${option.label}` : `Осталось ${option.label}, ${optionGrams} г`}
              onClick={() => onCount({ fraction: option.value })}
            >
              {option.label}
              {optionGrams === null ? null : <small>{formatNumber(optionGrams)} г</small>}
            </button>
          );
        })}
      </div>
      <div className="shelf-menu__sep" />
      <form className="shelf-exact" onSubmit={submit}>
        <label htmlFor={inputId}>Точно, если взвесили</label>
        <span className="shelf-grams" data-on={value ? true : undefined}>
          <input
            id={inputId}
            inputMode="numeric"
            autoComplete="off"
            placeholder="—"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <span>г</span>
        </span>
        <button type="submit" className="btn" data-size="sm" data-variant={grams === null ? 'ghost' : 'primary'} disabled={grams === null}>
          Сохранить
        </button>
      </form>
      {note ? <p className="shelf-note">{note}</p> : null}
      {onEmpty ? (
        <>
          <div className="shelf-menu__sep" />
          <button type="button" className="shelf-menu__item shelf-menu__item--danger" onClick={onEmpty}>
            Закончился <span className="shelf-faint">гость перестанет видеть</span>
          </button>
        </>
      ) : null}
    </>
  );
};

type FormProps<T> = {
  row: ShelfRow;
  onSubmit: (input: T) => void;
  onCancel: () => void;
  // На телефоне без автофокуса: иначе шторку сразу накрывает клавиатура.
  autoFocus?: boolean;
};

const GramsField = ({ label, value, unit, onChange, inputMode = 'numeric', autoFocus = false }: {
  label: string;
  value: string;
  unit: string;
  onChange: (value: string) => void;
  inputMode?: 'numeric' | 'decimal';
  autoFocus?: boolean;
}) => {
  const id = useId();
  return (
    <div className="shelf-form__row">
      <label htmlFor={id}>{label}</label>
      <span className="shelf-grams" data-on={value ? true : undefined}>
        <input id={id} inputMode={inputMode} autoComplete="off" placeholder="—" value={value} autoFocus={autoFocus} onChange={(event) => onChange(event.target.value)} />
        <span>{unit}</span>
      </span>
    </div>
  );
};

// «Добавить приход без счёта» (#shot=shelf-receipt).
export const ShelfReceiptForm = ({ row, onSubmit, onCancel, autoFocus = true }: FormProps<{ grams: number; priceKop?: number }>) => {
  const [grams, setGrams] = useState(String(row.lastReceipt?.grams ?? defaultReceiptGrams(row.tobacco.manufacturer)));
  const [price, setPrice] = useState('');
  const receipt = parseReceipt(grams, price);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (receipt) onSubmit(receipt);
  };

  return (
    <form className="shelf-form" onSubmit={submit}>
      <GramsField label="Сколько пришло" value={grams} unit="г" onChange={setGrams} autoFocus={autoFocus} />
      <GramsField label="Цена за весь приход" value={price} unit="₽" inputMode="decimal" onChange={setPrice} />
      <p className="shelf-note">Цену можно не указывать. Если есть счёт, загрузите его в разделе Поставки.</p>
      <div className="shelf-form__actions">
        <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn" data-size="sm" data-variant="primary" disabled={!receipt}>
          {receipt ? `Добавить ${formatNumber(receipt.grams)} г` : 'Добавить'}
        </button>
      </div>
    </form>
  );
};

// «Списать» (#shot=shelf-writeoff): по умолчанию весь остаток.
export const ShelfWriteOffForm = ({ row, onSubmit, onCancel, autoFocus = true }: FormProps<{ grams: number; reason: string }>) => {
  const [grams, setGrams] = useState(String(Math.max(0, Math.round(row.leftGrams ?? 0)) || ''));
  const [reason, setReason] = useState('');
  const parsed = parseGrams(grams, 1);
  const text = reason.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsed !== null && text) onSubmit({ grams: parsed, reason: text });
  };

  return (
    <form className="shelf-form" onSubmit={submit}>
      <GramsField label="Сколько" value={grams} unit="г" onChange={setGrams} />
      <input
        className="text-input"
        aria-label="Причина списания"
        placeholder="Причина, например брак"
        value={reason}
        autoFocus={autoFocus}
        onChange={(event) => setReason(event.target.value)}
      />
      <p className="shelf-note">Списанное не учитывается в расходе. Если списать всё, гость перестанет видеть табак.</p>
      <div className="shelf-form__actions">
        <button type="button" className="btn" data-size="sm" data-variant="ghost" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn" data-size="sm" data-variant="primary" disabled={parsed === null || !text}>
          {parsed === null ? 'Списать' : `Списать ${formatNumber(parsed)} г`}
        </button>
      </div>
    </form>
  );
};
