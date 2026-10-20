import { useState, type FormEvent } from 'react';
import { useIsPhone } from '@/hooks/use-is-phone';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ShelfSettings } from '@/contracts';
import { validateShelfSettings } from '@/lib/reorder';
import { describeShelfError } from '@/lib/shelf';

type ShelfSettingsDialogProps = {
  settings: ShelfSettings;
  onSave: (settings: ShelfSettings) => Promise<unknown>;
  onClose: () => void;
};

// Настройки полки (README §7): два поля и «Сохранить». Диалог монтируется
// при открытии, поэтому поля всегда начинаются с текущих значений.
export const ShelfSettingsDialog = ({ settings, onSave, onClose }: ShelfSettingsDialogProps) => {
  const [bowlGrams, setBowlGrams] = useState(String(settings.bowlGrams));
  const [leadDays, setLeadDays] = useState(String(settings.leadDays));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // На телефоне (#228) — нижней шторкой на всю ширину и без автофокуса: иначе сразу выскакивает клавиатура.
  const isPhone = useIsPhone();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const checked = validateShelfSettings({ bowlGrams, leadDays });
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

  return (
    <Dialog open onOpenChange={(next) => (next || busy ? null : onClose())}>
      <DialogContent className={`operator-dialog${isPhone ? ' operator-dialog--phone' : ''}`} showCloseButton={false}
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
          <p className="operator-dialog__eyebrow">Полка · настройки</p>
          <DialogTitle className="operator-dialog__title">Настройки полки</DialogTitle>
          <DialogDescription className="operator-dialog__sub">
            Из них считаются чаши в прогнозе, «Заканчивается» и «К заказу».
          </DialogDescription>
        </DialogHeader>
        <form className="operator-dialog__form" onSubmit={(event) => void submit(event)} noValidate>
          <div className="operator-dialog__body">
            <div className="deliv-form-row">
              <label className="operator-dialog__field">
                <span className="operator-dialog__label">Граммовка чаши, г</span>
                <span className="input">
                  <input type="number" inputMode="numeric" min={1} max={100} step={1} value={bowlGrams} onChange={(event) => setBowlGrams(event.target.value)} autoFocus={!isPhone} />
                </span>
              </label>
              <label className="operator-dialog__field">
                <span className="operator-dialog__label">Срок поставки, дней</span>
                <span className="input">
                  <input type="number" inputMode="numeric" min={1} max={60} step={1} value={leadDays} onChange={(event) => setLeadDays(event.target.value)} />
                </span>
              </label>
            </div>
            <p className="operator-dialog__sub">
              Табак «заканчивается», когда его хватит на срок поставки или меньше.
            </p>
            {error ? <p className="operator-dialog__error">{error}</p> : null}
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
