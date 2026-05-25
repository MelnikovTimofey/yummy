import { useMemo, type FormEventHandler } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { InventoryTobacco, MixRecord } from '@/contracts';
import type { MixEditorComponentInput, MixEditorViewState } from '@/components/mixes/mix-catalog-view';
import { ComponentCard } from './component-card';
import { ProportionBar } from './proportion-bar';
import { TobaccoLibrary } from './tobacco-library';
import { componentPercent, componentsTotal } from './rebalance';

type MixBuilderProps = {
  mode: 'create' | 'edit';
  editor: MixEditorViewState;
  tobaccos: InventoryTobacco[];
  mixes: MixRecord[];
  saveStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveError: string;
  onFieldChange: (field: 'name' | 'description', value: string) => void;
  onAvailabilityChange: (available: boolean) => void;
  onAddComponent: (tobaccoId: string) => void;
  onUpdateComponent: (key: string, patch: Partial<Omit<MixEditorComponentInput, 'key'>>) => void;
  onRemoveComponent: (key: string) => void;
  onReplaceComponents: (components: MixEditorComponentInput[]) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onCancel: () => void;
};

const uniq = (values: string[]) => Array.from(new Set(values));

export const MixBuilder = ({
  mode,
  editor,
  tobaccos,
  mixes,
  saveStatus,
  saveError,
  onFieldChange,
  onAvailabilityChange,
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  onReplaceComponents,
  onSubmit,
  onCancel,
}: MixBuilderProps) => {
  const tobaccoMap = useMemo(() => {
    const map = new Map<string, InventoryTobacco>();
    tobaccos.forEach((tobacco) => map.set(tobacco.id, tobacco));
    return map;
  }, [tobaccos]);

  const currentIds = useMemo(
    () => editor.components.map((component) => component.tobaccoId),
    [editor.components],
  );

  const aggregatedProfiles = useMemo(() => {
    const all: string[] = [];
    editor.components.forEach((component) => {
      const tobacco = tobaccoMap.get(component.tobaccoId);
      if (tobacco?.flavorProfiles) all.push(...tobacco.flavorProfiles);
    });
    return uniq(all);
  }, [editor.components, tobaccoMap]);

  const aggregatedFlavors = useMemo(() => {
    const all: string[] = [];
    editor.components.forEach((component) => {
      const tobacco = tobaccoMap.get(component.tobaccoId);
      if (tobacco?.flavors) all.push(...tobacco.flavors);
    });
    return uniq(all);
  }, [editor.components, tobaccoMap]);

  const totalPercent = componentsTotal(editor.components);
  const blockedByStock = editor.components.some((component) => {
    const tobacco = tobaccoMap.get(component.tobaccoId);
    return tobacco ? !tobacco.inStock : false;
  });
  const isValid =
    editor.name.trim().length > 0 && editor.components.length >= 1 && totalPercent === 100;

  return (
    <form className="mix-builder" onSubmit={onSubmit}>
      <header className="mix-builder__header">
        <button
          type="button"
          className="mix-builder__back"
          onClick={onCancel}
          aria-label="Назад к каталогу миксов"
        >
          <ArrowLeft size={16} aria-hidden="true" />
        </button>
        <div className="mix-builder__breadcrumb">
          <span className="mix-builder__breadcrumb-eyebrow">Миксы</span>
          <span className="mix-builder__breadcrumb-divider" aria-hidden="true">/</span>
          <h2 className="mix-builder__breadcrumb-name">
            {mode === 'edit' ? editor.name || 'Без названия' : 'Новый микс'}
          </h2>
          <span className="mix-builder__breadcrumb-meta">
            {editor.components.length}{' '}
            {editor.components.length === 1 ? 'табак' : 'табака'} · {totalPercent}%
          </span>
          {totalPercent === 100 ? (
            <span className="mix-builder__chip mix-builder__chip--success">Сумма долей: 100%</span>
          ) : (
            <span className="mix-builder__chip mix-builder__chip--warning">
              {totalPercent > 100 ? 'Сумма: переполнено' : `Сумма: осталось ${100 - totalPercent}%`}
            </span>
          )}
          {blockedByStock ? (
            <span className="mix-builder__chip mix-builder__chip--danger">блокируется наличием</span>
          ) : null}
        </div>
        <div className="mix-builder__actions">
          <label className="mix-builder__availability">
            <input
              type="checkbox"
              checked={editor.available}
              onChange={(event) => onAvailabilityChange(event.target.checked)}
            />
            <span>Доступен</span>
          </label>
          <button type="button" className="secondary-button secondary-button--inline" onClick={onCancel}>
            Отмена
          </button>
          <button
            type="submit"
            className="primary-button primary-button--inline"
            disabled={!isValid || saveStatus === 'loading'}
          >
            {saveStatus === 'loading' ? 'Сохраняем...' : mode === 'edit' ? 'Сохранить' : 'Создать микс'}
          </button>
        </div>
      </header>

      <div className="mix-builder__body">
        {/* Composition column */}
        <section className="mix-builder__composition" aria-label="Состав микса">
          <header className="mix-builder__section-head">
            <h2>Состав</h2>
            <p>Перетащите границы или введите доли вручную.</p>
          </header>
          <ProportionBar components={editor.components} onResize={onReplaceComponents} />
          <div className="mix-builder__components">
            {editor.components.length === 0 ? (
              <div className="mix-builder__empty">
                <strong>Состав пуст</strong>
                <p>Добавьте табак из библиотеки справа →</p>
              </div>
            ) : (
              editor.components.map((component) => (
                <ComponentCard
                  key={component.key}
                  component={component}
                  tobacco={tobaccoMap.get(component.tobaccoId) ?? null}
                  onPercentChange={(nextPercent) =>
                    onUpdateComponent(component.key, { proportion: String(nextPercent) })
                  }
                  onRemove={() => onRemoveComponent(component.key)}
                />
              ))
            )}
          </div>
        </section>

        {/* Preview column */}
        <section className="mix-builder__preview" aria-label="Предпросмотр микса">
          <label className="mix-builder__field">
            <span className="field-label">Название микса</span>
            <input
              type="text"
              className="text-input"
              value={editor.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              placeholder="Например, Tropical Punch"
              autoFocus={mode === 'create'}
            />
          </label>

          <label className="mix-builder__field">
            <span className="field-label">Описание для гостя</span>
            <textarea
              className="textarea-input"
              value={editor.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              placeholder="1–2 строки, что почувствует гость"
              rows={3}
            />
          </label>

          {editor.components.length > 0 ? (
            <div className="mix-builder__profile">
              <header className="mix-builder__section-head">
                <h3>Вкусовой профиль</h3>
              </header>
              {aggregatedProfiles.length ? (
                <div className="mix-builder__profile-chips">
                  {aggregatedProfiles.map((profile) => (
                    <span className="mix-builder__chip mix-builder__chip--accent" key={profile}>
                      {profile}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mix-builder__profile-empty">Нет категорий у выбранных табаков.</p>
              )}
              {aggregatedFlavors.length ? (
                <div className="mix-builder__profile-chips mix-builder__profile-chips--ghost">
                  {aggregatedFlavors.map((flavor) => (
                    <span className="mix-builder__chip mix-builder__chip--ghost" key={flavor}>
                      {flavor}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {editor.railMemberships.length > 0 ? (
            <div className="mix-builder__memberships">
              <header className="mix-builder__section-head">
                <h3>В рейлах</h3>
              </header>
              <ul>
                {editor.railMemberships.map((membership) => (
                  <li key={membership.railId}>{membership.railName}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {saveError ? <p className="error-text">{saveError}</p> : null}

          {totalPercent !== 100 && editor.components.length > 0 ? (
            <p className="mix-builder__hint">
              Сумма долей должна быть равна 100% — сейчас {totalPercent}%. Подвиньте сегмент или
              отредактируйте процент в карточке.
            </p>
          ) : null}

          {editor.components.length > 0 && totalPercent === 100 ? (
            <p className="mix-builder__hint">
              Каждый компонент:{' '}
              {editor.components
                .map((c) => {
                  const t = tobaccoMap.get(c.tobaccoId);
                  return `${t?.name ?? c.tobaccoId} · ${componentPercent(c)}%`;
                })
                .join(', ')}
              .
            </p>
          ) : null}
        </section>

        {/* Library column */}
        <TobaccoLibrary
          tobaccos={tobaccos}
          mixes={mixes}
          currentIds={currentIds}
          onAdd={onAddComponent}
        />
      </div>
    </form>
  );
};
