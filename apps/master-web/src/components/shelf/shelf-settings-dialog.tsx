import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Calculator } from 'lucide-react';
import { useIsPhone } from '@/hooks/use-is-phone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ShelfHorizon, ShelfInterval, ShelfSettings } from '@/contracts';
import { budgetInput, settingsCalcNote, validateShelfSettings } from '@/lib/reorder';
import { describeShelfError } from '@/lib/shelf';
import { Segments } from './shelf-reorder';

type ShelfSettingsDialogProps = {
  settings: ShelfSettings;
  // Интервал и горизонт — для «Считается само»; без полки их нет и блок не показываем.
  interval?: ShelfInterval;
  horizon?: ShelfHorizon;
  onSave: (settings: ShelfSettings) => Promise<unknown>;
  onClose: () => void;
};

type FieldProps = {
  label: string;
  help: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  suffix?: string;
  inputProps?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>;
};

// Подсказка видна всегда, а не в тултипе: настройки открывают редко (#326).
const Field = ({ label, help, value, onChange, wide = false, suffix, inputProps }: FieldProps) => {
  const id = useId();
  return (
    <div className={`operator-dialog__field shelf-settings__field${wide ? ' shelf-settings__field--wide' : ''}`}>
      <label className="operator-dialog__label" htmlFor={id}>
        {label}
      </label>
      <span className="input">
        <input id={id} aria-describedby={`${id}-help`} value={value} onChange={(event) => onChange(event.target.value)} {...inputProps} />
        {suffix ? <span className="shelf-settings__suffix">{suffix}</span> : null}
      </span>
      <p className="shelf-settings__help" id={`${id}-help`}>
        {help}
      </p>
    </div>
  );
};

// Настройки полки (#shot=settings): граммовка чаши, срок поставки и бюджет на табак;
// под каждым полем — что это и на что влияет. Диалог монтируется при открытии,
// поэтому поля всегда начинаются с текущих значений.
export const ShelfSettingsDialog = ({ settings, interval, horizon, onSave, onClose }: ShelfSettingsDialogProps) => {
  const [bowlGrams, setBowlGrams] = useState(String(settings.bowlGrams));
  const [leadDays, setLeadDays] = useState(String(settings.leadDays));
  const [budget, setBudget] = useState(budgetInput(settings.budgetKop));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // На телефоне (#228) — нижней шторкой на всю ширину и без автофокуса: иначе сразу выскакивает клавиатура.
  const isPhone = useIsPhone();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const checked = validateShelfSettings({ bowlGrams, leadDays, budget });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(checked.value);
      onClose();
    } catch (cause) {
      setError(describeShelfError(cause));
    } finally {
      setBusy(false);
    }
  };

  const numeric = { type: 'number', inputMode: 'numeric', step: 1 } as const;

  return (
    <Dialog open onOpenChange={(next) => (next || busy ? null : onClose())}>
      <DialogContent
        className={`operator-dialog shelf-settings${isPhone ? ' operator-dialog--phone' : ''}`}
        showCloseButton={false}
        // Подзаголовка нет: что считается из настроек, сказано под каждым полем.
        aria-describedby={undefined}
        onOpenAutoFocus={
          isPhone
            ? (event) => {
                event.preventDefault();
                (event.currentTarget as HTMLElement | null)?.focus();
              }
            : undefined
        }
      >
        <DialogHeader className="operator-dialog__head">
          <DialogTitle className="operator-dialog__title">Настройки полки</DialogTitle>
        </DialogHeader>
        <form className="operator-dialog__form" onSubmit={(event) => void submit(event)} noValidate>
          <div className="operator-dialog__body shelf-settings__body">
            <Field
              label="Граммовка чаши, г"
              help="Сколько табака уходит на одну чашу. По ней считаются чаши в прогнозе и себестоимость чаши."
              value={bowlGrams}
              onChange={setBowlGrams}
              inputProps={{ ...numeric, min: 1, max: 100, autoFocus: !isPhone }}
            />
            <Field
              label="Срок поставки, дней"
              help="Сколько дней от заявки поставщику до табака на полке. Табак, который закончится раньше, попадёт в заказ."
              value={leadDays}
              onChange={setLeadDays}
              inputProps={{ ...numeric, min: 1, max: 60 }}
            />
            <Field
              wide
              label="Бюджет на табак, ₽ в месяц"
              help="Необязательно. В закупке видно, сколько уходит на базу и сколько остаётся на пробы."
              value={budget}
              onChange={setBudget}
              suffix="₽"
              inputProps={{ inputMode: 'numeric', autoComplete: 'off', placeholder: 'не указан' }}
            />
            {interval && horizon ? (
              <p className="shelf-settings__calc">
                <Calculator size={14} aria-hidden />
                <span>
                  <Segments segments={settingsCalcNote(interval, horizon, settings.leadDays)} />
                </span>
              </p>
            ) : null}
            {error ? <p className="operator-dialog__error shelf-settings__field--wide">{error}</p> : null}
          </div>
          <footer className="operator-dialog__foot">
            <button type="button" className="btn" data-variant="ghost" disabled={busy} onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn" data-variant="primary" disabled={busy}>
              Сохранить
            </button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
};
