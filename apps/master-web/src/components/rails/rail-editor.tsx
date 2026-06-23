import {
  useMemo,
  useState,
  type DragEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from 'react';
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, Search, X } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import type { MixRecord, RailRecord } from '@/contracts';
import { formatRailType } from '@/contracts';

export type RailEditorState = {
  id: string;
  name: string;
  description: string;
  type: RailRecord['type'];
  mixIds: string[];
  active: boolean;
  editable: boolean;
  readOnlyReason: string;
};

type RailEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: RailEditorState;
  setEditor: Dispatch<SetStateAction<RailEditorState>>;
  railMixCatalog: MixRecord[];
  mixes: MixRecord[];
  /** Legacy: single-candidate API заменён на live-поиск в picker'е. */
  railMixCandidateId: string;
  setRailMixCandidateId: (id: string) => void;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAddMix: (mixId: string) => void;
  onRemoveMix: (mixId: string) => void;
  onMoveMix: (mixId: string, direction: 'up' | 'down') => void;
  onReorderMixes: (sourceId: string, targetId: string) => void;
  onReset: () => void;
};

export const RailEditor = ({
  open,
  onOpenChange,
  editor,
  setEditor,
  railMixCatalog,
  mixes,
  saveStatus,
  saveError,
  onSubmit,
  onAddMix,
  onRemoveMix,
  onMoveMix,
  onReorderMixes,
  onReset,
}: RailEditorProps) => {
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');

  // useMemo до условных return — следуем предупреждению handoff (баг RailEditor с hooks-order).
  const selectedRailMixEntries = useMemo(
    () =>
      editor.mixIds.map((mixId, index) => ({
        mixId,
        index,
        mix:
          railMixCatalog.find((item) => item.id === mixId) ??
          mixes.find((item) => item.id === mixId) ??
          null,
      })),
    [editor.mixIds, railMixCatalog, mixes],
  );

  const availableRailMixOptions = useMemo(() => {
    const have = new Set(editor.mixIds);
    const q = pickerQuery.trim().toLowerCase();
    return railMixCatalog
      .filter((mix) => !have.has(mix.id))
      .filter((mix) => {
        if (!q) return true;
        return (
          mix.name.toLowerCase().includes(q) ||
          mix.description.toLowerCase().includes(q) ||
          mix.flavorProfiles.some((tag) => tag.toLowerCase().includes(q)) ||
          mix.flavors.some((tag) => tag.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [railMixCatalog, editor.mixIds, pickerQuery]);

  const locked = Boolean(editor.id) && !editor.editable;
  const headerEyebrow = editor.id ? 'Редактирование рейла' : 'Новый рейл';
  const headerTitle = editor.name || (editor.id ? 'Без названия' : 'Новый рейл');
  const submitLabel = saveStatus === 'loading'
    ? 'Сохраняем…'
    : editor.id
      ? 'Сохранить'
      : 'Создать';

  const handleClose = () => {
    onOpenChange(false);
    onReset();
    setPickerQuery('');
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          onReset();
          setPickerQuery('');
        }
      }}
    >
      <SheetContent
        side="right"
        className="rails-surface__sheet rail-drawer"
        showCloseButton={false}
      >
        <header className="drawer__head rail-drawer__head">
          <div className="rail-drawer__head-copy">
            <p className="rail-drawer__eyebrow">{headerEyebrow}</p>
            <SheetTitle className="rail-drawer__title">{headerTitle}</SheetTitle>
            {locked && editor.readOnlyReason ? (
              <p className="rail-drawer__lock">{editor.readOnlyReason}</p>
            ) : null}
          </div>
          <div className="rail-drawer__head-meta">
            <span className="tag" data-tone={editor.type === 'statistical' ? 'info' : editor.type === 'prepared' ? 'warning' : 'accent'}>
              {formatRailType(editor.type)}
            </span>
            {locked ? <span className="tag tag--ghost">только просмотр</span> : null}
          </div>
          <button
            type="button"
            className="rail-drawer__close"
            onClick={handleClose}
            aria-label="Закрыть"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <form className="rail-drawer__form" onSubmit={onSubmit}>
          <div className="drawer__body rail-drawer__body">
            {/* Column 1 — поиск + добавление */}
            <section className="rail-drawer__col">
              <h3 className="rail-drawer__section-title">Добавить миксы</h3>
              <div className="input">
                <Search size={14} aria-hidden />
                <input
                  value={pickerQuery}
                  onChange={(event) => setPickerQuery(event.target.value)}
                  placeholder="Поиск микса…"
                  disabled={locked}
                />
              </div>

              <div className="rail-drawer__picker">
                {availableRailMixOptions.length === 0 ? (
                  <div className="empty">
                    {pickerQuery ? 'Ничего не найдено.' : 'Все миксы уже в рейле.'}
                  </div>
                ) : (
                  availableRailMixOptions.map((mix) => (
                    <button
                      key={mix.id}
                      type="button"
                      className="rail-drawer__picker-row"
                      onClick={() => !locked && onAddMix(mix.id)}
                      disabled={locked}
                    >
                      <div className="rail-drawer__picker-body">
                        <div className="rail-drawer__mix-name">{mix.name}</div>
                        <div className="rail-drawer__mix-meta">
                          {mix.description || `Рейтинг ${mix.avgRating.toFixed(1)} · Популярность ${mix.popularity}`}
                        </div>
                      </div>
                      <span className="rail-drawer__picker-action" aria-hidden>
                        <Plus size={14} />
                      </span>
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Column 2 — название, подзаголовок, состав */}
            <section className="rail-drawer__col">
              <label className="rail-drawer__field">
                <span className="rail-drawer__label">Название рейла</span>
                <div className="input input--lg">
                  <input
                    value={editor.name}
                    onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Например, Быстрый старт"
                    disabled={locked}
                  />
                </div>
              </label>

              <label className="rail-drawer__field">
                <span className="rail-drawer__label">Подзаголовок для гостя</span>
                <div className="input">
                  <input
                    value={editor.description}
                    onChange={(event) =>
                      setEditor((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Лёгкие и понятные миксы для первого выбора."
                    disabled={locked}
                  />
                </div>
              </label>

              <div className="rail-drawer__field">
                <div className="rail-drawer__section-head">
                  <h3 className="rail-drawer__section-title">
                    Состав рейла · {editor.mixIds.length}
                  </h3>
                  {!locked && selectedRailMixEntries.length > 1 ? (
                    <span className="rail-drawer__hint">тяни ↕ для порядка</span>
                  ) : null}
                </div>

                <div className="rail-drawer__mix-list">
                  {selectedRailMixEntries.length === 0 ? (
                    <div className="empty">
                      {locked
                        ? 'В рейле нет миксов.'
                        : '← Добавь миксы из списка слева'}
                    </div>
                  ) : (
                    selectedRailMixEntries.map(({ mixId, index, mix }) => (
                      <div
                        key={mixId}
                        className={[
                          'rail-drawer__mix-row',
                          dragSourceId === mixId ? 'rail-drawer__mix-row--dragging' : '',
                        ].filter(Boolean).join(' ')}
                        draggable={!locked}
                        onDragStart={(event: DragEvent<HTMLDivElement>) => {
                          if (locked) return;
                          setDragSourceId(mixId);
                          event.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(event: DragEvent<HTMLDivElement>) => {
                          if (locked || !dragSourceId) return;
                          event.preventDefault();
                          event.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(event: DragEvent<HTMLDivElement>) => {
                          if (locked || !dragSourceId) return;
                          event.preventDefault();
                          onReorderMixes(dragSourceId, mixId);
                          setDragSourceId(null);
                        }}
                        onDragEnd={() => setDragSourceId(null)}
                      >
                        <span className="rail-drawer__mix-order">{index + 1}</span>
                        <span className="rail-drawer__mix-grip" aria-hidden>
                          <GripVertical size={14} />
                        </span>
                        <div className="rail-drawer__mix-body">
                          <div className="rail-drawer__mix-name">{mix?.name ?? mixId}</div>
                          <div className="rail-drawer__mix-meta">
                            {mix
                              ? mix.description ||
                                `${mix.guestVisible ? 'Виден гостю' : mix.available ? 'Скрыт оператором' : 'Заблокирован наличием'} · Рейтинг ${mix.avgRating.toFixed(1)}`
                              : 'Микс не найден в актуальном каталоге.'}
                          </div>
                        </div>
                        <div className="rail-drawer__mix-actions">
                          {mix && !mix.available ? (
                            <span className="tag" data-tone="warning">блокирован</span>
                          ) : null}
                          {mix && !mix.guestVisible && mix.available ? (
                            <span className="tag tag--ghost">скрыт</span>
                          ) : null}
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onMoveMix(mixId, 'up')}
                            disabled={locked || index === 0}
                            aria-label="Выше"
                          >
                            <ChevronUp size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onMoveMix(mixId, 'down')}
                            disabled={locked || index === selectedRailMixEntries.length - 1}
                            aria-label="Ниже"
                          >
                            <ChevronDown size={14} aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => onRemoveMix(mixId)}
                            disabled={locked}
                            aria-label="Убрать"
                          >
                            <X size={14} aria-hidden />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* Column 3 — preview гостя */}
            <aside className="rail-drawer__col rail-drawer__col--preview">
              <h3 className="rail-drawer__section-title">Как увидит гость</h3>
              <div className="rail-drawer__preview">
                <div className="rail-drawer__phone">
                  <h4 className="rail-drawer__preview-title">
                    {editor.name || 'Название рейла'}
                  </h4>
                  {editor.description ? (
                    <p className="rail-drawer__preview-desc">{editor.description}</p>
                  ) : null}
                  <div className="rail-drawer__preview-strip">
                    {selectedRailMixEntries.length ? (
                      selectedRailMixEntries.slice(0, 6).map(({ mixId, mix }) => (
                        <div className="rail-drawer__preview-card" key={mixId}>
                          <div className="rail-drawer__preview-art" />
                          <div className="rail-drawer__preview-card-name">
                            {mix?.name ?? '—'}
                          </div>
                          {mix?.description ? (
                            <div className="rail-drawer__preview-card-desc">{mix.description}</div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="rail-drawer__preview-empty">
                        Пока пусто. Добавь миксы — гость увидит здесь.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {saveError ? <p className="rail-drawer__error">{saveError}</p> : null}

          <footer className="drawer__foot rail-drawer__foot">
            <div className="rail-drawer__foot-left">
              <button
                type="button"
                role="switch"
                aria-checked={editor.active}
                className={`toggle ${editor.active ? 'toggle--on' : 'toggle--off'}`}
                onClick={() =>
                  !locked && setEditor((current) => ({ ...current, active: !current.active }))
                }
                aria-label="Активен"
                disabled={locked}
              >
                <span className="toggle__track" aria-hidden="true">
                  <span className="toggle__thumb" />
                </span>
              </button>
              <span className="rail-drawer__foot-hint">
                {editor.active ? 'Активен — гость видит на витрине' : 'Скрыт от гостя'}
              </span>
            </div>
            <div className="rail-drawer__foot-actions">
              <button
                type="button"
                className="btn"
                data-variant="ghost"
                onClick={handleClose}
              >
                {locked ? 'Закрыть' : 'Отмена'}
              </button>
              {!locked ? (
                <button
                  type="submit"
                  className="btn"
                  data-variant="primary"
                  disabled={saveStatus === 'loading'}
                >
                  <Check size={14} aria-hidden />
                  {submitLabel}
                </button>
              ) : null}
            </div>
          </footer>
        </form>
      </SheetContent>
    </Sheet>
  );
};
