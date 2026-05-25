import { useMemo, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SearchableEntitySelect } from '@/components/ui/searchable-entity-select';
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
  railMixCandidateId: string;
  setRailMixCandidateId: (id: string) => void;
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  onAddMix: (mixId: string) => void;
  onRemoveMix: (mixId: string) => void;
  onMoveMix: (mixId: string, direction: 'up' | 'down') => void;
  onReset: () => void;
};

export const RailEditor = ({
  open,
  onOpenChange,
  editor,
  setEditor,
  railMixCatalog,
  mixes,
  railMixCandidateId,
  setRailMixCandidateId,
  saveStatus,
  saveError,
  onSubmit,
  onAddMix,
  onRemoveMix,
  onMoveMix,
  onReset,
}: RailEditorProps) => {
  // useMemo стоит ДО любых условных return — следуем предупреждению handoff
  // (исторический баг RailEditor с hooks-order).
  const selectedRailMixEntries = useMemo(
    () =>
      editor.mixIds.map((mixId, index) => ({
        mixId,
        index,
        mix: railMixCatalog.find((item) => item.id === mixId) ?? mixes.find((item) => item.id === mixId) ?? null,
      })),
    [editor.mixIds, railMixCatalog, mixes],
  );

  const availableRailMixOptions = useMemo(
    () =>
      railMixCatalog
        .filter((mix) => !editor.mixIds.includes(mix.id))
        .sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    [railMixCatalog, editor.mixIds],
  );

  const effectiveRailMixCandidateId = availableRailMixOptions.some((mix) => mix.id === railMixCandidateId)
    ? railMixCandidateId
    : (availableRailMixOptions[0]?.id ?? '');

  const railMixPickerOptions = useMemo(
    () =>
      availableRailMixOptions.map((mix) => ({
        id: mix.id,
        title: mix.name,
        subtitle: `${mix.guestVisible ? 'Виден гостю' : mix.available ? 'Скрыт оператором' : 'Заблокирован наличием'} · Рейтинг ${mix.avgRating.toFixed(1)} · Популярность ${mix.popularity}`,
        keywords: [mix.description, ...mix.flavorProfiles, ...mix.flavors, ...mix.flavorTags],
      })),
    [availableRailMixOptions],
  );

  const railEditorLocked = Boolean(editor.id) && !editor.editable;
  const railEditorStatusLabel = railEditorLocked
    ? 'Только просмотр'
    : editor.active
      ? 'Активен'
      : 'Неактивен';

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          onReset();
        }
      }}
    >
      <SheetContent side="right" className="rails-surface__sheet">
        <SheetHeader>
          <SheetTitle>
            {editor.id ? editor.name || 'Без названия' : 'Новый рейл'}
          </SheetTitle>
          <SheetDescription>
            {editor.id
              ? 'Редактирование рейла. Состав влияет на гостевую витрину.'
              : 'Соберите подборку миксов для гостевой витрины.'}
          </SheetDescription>
        </SheetHeader>
        <article className="editor-card ops-editor rails-surface__editor rails-surface__editor--sheet">
          <div className="entity-card__head entity-card__head--sheet">
            <span className={railEditorLocked ? 'status-chip status-chip--locked' : 'status-chip'}>{railEditorStatusLabel}</span>
          </div>

          <form className="admin-form" onSubmit={onSubmit}>
            {editor.id ? (
              <div className="info-banner rails-surface__banner">
                Тип рейла: {formatRailType(editor.type)}.
                {!editor.editable && editor.readOnlyReason ? ` ${editor.readOnlyReason}` : ''}
              </div>
            ) : (
              <div className="info-banner rails-surface__banner">
                Новый рейл создаётся как мастерская подборка. Тип вручную выбирать не нужно.
              </div>
            )}

            <div className="form-grid form-grid--two">
              <label className="field">
                <span className="field-label">Название</span>
                <input
                  className="text-input"
                  value={editor.name}
                  onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Например, Топ по статистике"
                  disabled={railEditorLocked}
                />
              </label>

              <div className="field">
                <span className="field-label">Тип</span>
                <div className="info-banner">{formatRailType(editor.type)}</div>
              </div>

              <label className="field field--wide">
                <span className="field-label">Описание</span>
                <textarea
                  className="textarea-input"
                  value={editor.description}
                  onChange={(event) => setEditor((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Короткое описание рейла"
                  rows={3}
                  disabled={railEditorLocked}
                />
              </label>

              <div className="field field--wide">
                <span className="field-label">Состав рейла</span>
                <div className="rail-mix-builder rails-surface__mix-builder">
                  <div className="rail-mix-builder__toolbar ops-toolbar rails-surface__mix-toolbar">
                    <SearchableEntitySelect
                      value={effectiveRailMixCandidateId}
                      options={railMixPickerOptions}
                      placeholder="Выберите микс"
                      searchPlaceholder="Поиск микса по названию, вкусу или описанию"
                      emptyLabel="Нет доступных миксов."
                      clearLabel="Очистить выбор"
                      listAriaLabel="Миксы для состава рейла"
                      disabled={railEditorLocked || !railMixPickerOptions.length}
                      onSelect={setRailMixCandidateId}
                    />
                    <button
                      className="secondary-button secondary-button--inline"
                      type="button"
                      onClick={() => onAddMix(effectiveRailMixCandidateId)}
                      disabled={railEditorLocked || !effectiveRailMixCandidateId}
                    >
                      Добавить микс
                    </button>
                  </div>

                  <div className="rail-mix-builder__summary ops-surface__summary rails-surface__mix-summary">
                    <span className="meta-line">В рейле: {editor.mixIds.length}</span>
                    <span className="meta-line">Доступно для добавления: {availableRailMixOptions.length}</span>
                  </div>

                  <div className="rail-mix-list ops-table-shell rails-surface__mix-list">
                    {selectedRailMixEntries.length ? selectedRailMixEntries.map(({ mixId, index, mix }) => (
                      <article className="rail-mix-row ops-surface__card rails-surface__mix-row" key={mixId}>
                        <div className="rail-mix-row__order">{index + 1}</div>
                        <div className="rail-mix-row__content">
                          <strong>{mix?.name ?? mixId}</strong>
                          <p className="meta-line">
                            {mix
                              ? `${mix.guestVisible ? 'Виден гостю' : mix.available ? 'Скрыт оператором' : 'Заблокирован наличием'} · Рейтинг ${mix.avgRating.toFixed(1)} · Популярность ${mix.popularity}`
                              : 'Микс не найден в актуальном каталоге, но сохранён в составе рейла.'}
                          </p>
                        </div>
                        <div className="rail-mix-row__actions">
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onMoveMix(mixId, 'up')}
                            disabled={railEditorLocked || index === 0}
                          >
                            Вверх
                          </button>
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onMoveMix(mixId, 'down')}
                            disabled={railEditorLocked || index === selectedRailMixEntries.length - 1}
                          >
                            Вниз
                          </button>
                          <button
                            className="secondary-button secondary-button--inline"
                            type="button"
                            onClick={() => onRemoveMix(mixId)}
                            disabled={railEditorLocked}
                          >
                            Убрать
                          </button>
                        </div>
                      </article>
                    )) : (
                      <div className="rail-mix-empty ops-empty-state">
                        <p className="meta-line">Добавьте хотя бы один микс, чтобы собрать рейл и задать порядок показа.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={editor.active}
                  onChange={(event) => setEditor((current) => ({ ...current, active: event.target.checked }))}
                  disabled={railEditorLocked}
                />
                <span>Активен в витрине</span>
              </label>
            </div>

            {saveError ? <p className="error-text">{saveError}</p> : null}

            <div className="form-actions">
              {!railEditorLocked ? (
                <button className="primary-button primary-button--inline" type="submit" disabled={saveStatus === 'loading'}>
                  {saveStatus === 'loading' ? 'Сохраняем...' : editor.id ? 'Сохранить рейл' : 'Создать рейл'}
                </button>
              ) : null}
              <button
                className="secondary-button secondary-button--inline"
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onReset();
                }}
              >
                Закрыть
              </button>
            </div>
          </form>
        </article>
      </SheetContent>
    </Sheet>
  );
};
