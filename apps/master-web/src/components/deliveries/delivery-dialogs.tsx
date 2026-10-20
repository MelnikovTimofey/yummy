import { useState, type FormEvent, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { InventoryTobacco } from '@/contracts';
import type { DeliveryLineInput, ManualDeliveryInput, NewTobaccoInput } from '@/hooks/use-deliveries';
import { describeShelfError } from '@/lib/shelf';
import { localDateInput, parseRubles } from '@/lib/deliveries';
import { TobaccoOptionLabel, TobaccoSearchResults, useTobaccoSearch, type TobaccoOption } from './tobacco-search';

const MAX_QTY = 50;
const MAX_GRAMS = 5000;

type ShellProps = {
  open: boolean;
  eyebrow: string;
  title: string;
  description: string;
  error: string;
  busy: boolean;
  submitLabel: string;
  submitVariant?: 'primary' | 'danger';
  onClose: () => void;
  onSubmit: () => void;
  children?: ReactNode;
};

// Общая оболочка коротких форм поставок — в стиле диалогов раздела «Доступ».
const FormDialog = ({ open, eyebrow, title, description, error, busy, submitLabel, submitVariant = 'primary', onClose, onSubmit, children }: ShellProps) => (
  <Dialog open={open} onOpenChange={(next) => (next || busy ? null : onClose())}>
    <DialogContent className="operator-dialog" showCloseButton={false}>
      <DialogHeader className="operator-dialog__head">
        <p className="operator-dialog__eyebrow">{eyebrow}</p>
        <DialogTitle className="operator-dialog__title">{title}</DialogTitle>
        <DialogDescription className="operator-dialog__sub">{description}</DialogDescription>
      </DialogHeader>
      <form
        className="operator-dialog__form"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="operator-dialog__body">
          {children}
          {error ? <p className="operator-dialog__error">{error}</p> : null}
        </div>
        <footer className="operator-dialog__foot">
          <button type="button" className="btn" data-variant="ghost" disabled={busy} onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn" data-variant={submitVariant} disabled={busy}>
            {submitLabel}
          </button>
        </footer>
      </form>
    </DialogContent>
  </Dialog>
);

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="operator-dialog__field">
    <span className="operator-dialog__label">{label}</span>
    {children}
  </label>
);

const useSubmit = () => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (cause) {
      setError(describeShelfError(cause));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, setError, run };
};

const readInt = (value: string, min: number, max: number) => {
  const text = value.trim();
  if (!text) return null;
  const number = Number(text);
  return Number.isInteger(number) && number >= min && number <= max ? number : undefined;
};

// --- Заполнить вручную --------------------------------------------------------

export const ManualDeliveryDialog = ({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: ManualDeliveryInput) => Promise<unknown>;
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [number, setNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(() => localDateInput(new Date()));
  const submit = useSubmit();

  return (
    <FormDialog
      open={open}
      eyebrow="Поставка · вручную"
      title="Заполнить вручную"
      description="Шапка счёта. Строки добавите в черновике — так же, как после разбора PDF."
      error={submit.error}
      busy={submit.busy}
      submitLabel="Создать черновик"
      onClose={onClose}
      onSubmit={() =>
        void submit.run(() =>
          onCreate({
            ...(supplierName.trim() ? { supplierName: supplierName.trim() } : {}),
            ...(number.trim() ? { number: number.trim() } : {}),
            ...(invoiceDate ? { invoiceDate } : {}),
          }),
        )
      }
    >
      <Field label="Поставщик">
        <span className="input">
          <input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Как в счёте" autoFocus />
        </span>
      </Field>
      <div className="deliv-form-row">
        <Field label="Номер счёта">
          <span className="input">
            <input value={number} onChange={(event) => setNumber(event.target.value)} placeholder="04102" />
          </span>
        </Field>
        <Field label="Дата счёта">
          <span className="input">
            <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} />
          </span>
        </Field>
      </div>
    </FormDialog>
  );
};

// --- Добавить строку ------------------------------------------------------------

export const AddLineDialog = ({
  open,
  search,
  onClose,
  onAdd,
}: {
  open: boolean;
  search: (query: string) => Promise<InventoryTobacco[]>;
  onClose: () => void;
  onAdd: (input: DeliveryLineInput) => Promise<unknown>;
}) => {
  const [rawName, setRawName] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [grams, setGrams] = useState('');
  const [query, setQuery] = useState('');
  const [tobacco, setTobacco] = useState<TobaccoOption | null>(null);
  const found = useTobaccoSearch(query, search);
  const submit = useSubmit();

  const onSubmit = () => {
    const name = rawName.trim() || (tobacco ? `${tobacco.manufacturer} ${tobacco.name}` : '');
    const count = readInt(qty, 1, MAX_QTY);
    const priceKop = parseRubles(price);
    const weight = readInt(grams, 1, MAX_GRAMS);
    if (!name) return submit.setError('Укажите название строки или выберите табак.');
    if (!count) return submit.setError(`Банок — целое число от 1 до ${MAX_QTY}.`);
    if (priceKop === undefined) return submit.setError('Цена — число рублей, например 1 550 или 1 550,50.');
    if (weight === undefined) return submit.setError(`Фасовка — целое число граммов от 1 до ${MAX_GRAMS}.`);
    void submit.run(() =>
      onAdd({
        rawName: name,
        qty: count,
        ...(priceKop !== null ? { priceKop } : {}),
        ...(weight !== null ? { grams: weight } : {}),
        ...(tobacco ? { tobaccoId: tobacco.id } : {}),
      }),
    );
  };

  return (
    <FormDialog
      open={open}
      eyebrow="Поставка · строка"
      title="Добавить строку"
      description="Строка счёта, которую разбор не нашёл, или позиция ручной поставки."
      error={submit.error}
      busy={submit.busy}
      submitLabel="Добавить строку"
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <Field label="Табак из каталога">
        {tobacco ? (
          <span className="deliv-chosen">
            <TobaccoOptionLabel option={tobacco} />
            <button type="button" className="icon-btn" aria-label="Снять выбор табака" onClick={() => setTobacco(null)}>
              ×
            </button>
          </span>
        ) : (
          <span className="input">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Бренд или вкус — можно оставить пустым"
              autoFocus
            />
          </span>
        )}
      </Field>
      {!tobacco && query.trim().length >= 2 ? (
        <div className="deliv-form-results" role="group" aria-label="Табаки каталога">
          <TobaccoSearchResults
            query={query}
            state={found.state}
            items={found.items}
            onPick={(option) => {
              setTobacco(option);
              setQuery('');
            }}
          />
        </div>
      ) : null}
      <Field label="Строка счёта">
        <span className="input">
          <input
            value={rawName}
            onChange={(event) => setRawName(event.target.value)}
            placeholder={tobacco ? `${tobacco.manufacturer} ${tobacco.name}` : 'Как в счёте'}
          />
        </span>
      </Field>
      <div className="deliv-form-row deliv-form-row--three">
        <Field label="Банок">
          <span className="input">
            <input inputMode="numeric" value={qty} onChange={(event) => setQty(event.target.value)} />
          </span>
        </Field>
        <Field label="Цена за банку, ₽">
          <span className="input">
            <input inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="1 550" />
          </span>
        </Field>
        <Field label="Фасовка, г">
          <span className="input">
            <input inputMode="numeric" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="из названия" />
          </span>
        </Field>
      </div>
    </FormDialog>
  );
};

// --- Создать карточку каталога --------------------------------------------------

export const CreateTobaccoDialog = ({
  initial,
  onClose,
  onCreate,
}: {
  initial: NewTobaccoInput & { grams: number | null; rawName: string };
  onClose: () => void;
  onCreate: (input: NewTobaccoInput, grams: number | null) => Promise<unknown>;
}) => {
  const [manufacturer, setManufacturer] = useState(initial.manufacturer);
  const [lineName, setLineName] = useState(initial.lineName);
  const [name, setName] = useState(initial.name);
  const [grams, setGrams] = useState(initial.grams ? String(initial.grams) : '');
  const submit = useSubmit();

  const onSubmit = () => {
    const weight = readInt(grams, 1, MAX_GRAMS);
    if (!manufacturer.trim()) return submit.setError('Нужен бренд.');
    if (!name.trim()) return submit.setError('Нужно название табака.');
    if (weight === undefined) return submit.setError(`Фасовка — целое число граммов от 1 до ${MAX_GRAMS}.`);
    void submit.run(() => onCreate({ manufacturer: manufacturer.trim(), lineName: lineName.trim(), name: name.trim() }, weight));
  };

  return (
    <FormDialog
      open
      eyebrow="Каталог · новая карточка"
      title="Создать карточку"
      description={`Из строки «${initial.rawName}». Банка встанет на полку при приёмке поставки.`}
      error={submit.error}
      busy={submit.busy}
      submitLabel="Создать и выбрать"
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <div className="deliv-form-row">
        <Field label="Бренд">
          <span className="input">
            <input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} autoFocus />
          </span>
        </Field>
        <Field label="Линейка">
          <span className="input">
            <input value={lineName} onChange={(event) => setLineName(event.target.value)} placeholder="необязательно" />
          </span>
        </Field>
      </div>
      <Field label="Название">
        <span className="input">
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </span>
      </Field>
      <Field label="Фасовка, г">
        <span className="input deliv-form-narrow">
          <input inputMode="numeric" value={grams} onChange={(event) => setGrams(event.target.value)} placeholder="200" />
        </span>
      </Field>
    </FormDialog>
  );
};

// --- Удалить черновик -----------------------------------------------------------

export const DeleteDraftDialog = ({ open, title, onClose, onDelete }: { open: boolean; title: string; onClose: () => void; onDelete: () => Promise<unknown> }) => {
  const submit = useSubmit();
  return (
    <FormDialog
      open={open}
      eyebrow="Поставка · черновик"
      title="Удалить черновик?"
      description={`${title}: строки и файл счёта удалятся. Банки по черновику не создавались, полка не изменится.`}
      error={submit.error}
      busy={submit.busy}
      submitLabel="Удалить черновик"
      submitVariant="danger"
      onClose={onClose}
      onSubmit={() => void submit.run(onDelete)}
    />
  );
};
