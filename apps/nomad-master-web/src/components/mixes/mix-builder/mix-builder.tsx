import { useMemo, type FormEventHandler } from 'react';
import { ArrowLeft, Scale } from 'lucide-react';
import type { InventoryTobacco } from '@/contracts';
import type { MixEditorComponentInput, MixEditorViewState } from '@/components/mixes/mix-catalog-view';
import { ComponentCard } from './component-card';
import { ProportionBar } from './proportion-bar';
import { TobaccoLibrary } from './tobacco-library';
import { componentsTotal, rebalanceTo100 } from './rebalance';

type MixBuilderProps = {
  mode: 'create' | 'edit';
  editor: MixEditorViewState;
  tobaccos: InventoryTobacco[];
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

// Пресеты пропорций по количеству компонентов. Для 1 — кнопки скрыты
// (одиночный = 100%), 5+ — только «Распределить поровну» (комбинаторика
// разгоняется, явных «канонических» миксов нет).
const PRESETS_BY_COUNT: Record<number, Array<number[]>> = {
  2: [
    [50, 50],
    [60, 40],
    [70, 30],
    [80, 20],
  ],
  3: [
    [34, 33, 33],
    [40, 30, 30],
    [50, 30, 20],
    [60, 20, 20],
  ],
  4: [
    [25, 25, 25, 25],
    [40, 20, 20, 20],
    [30, 30, 20, 20],
    [50, 20, 20, 10],
  ],
};

const formatPresetLabel = (parts: number[]) => parts.join('/');

const presetMatchesComponents = (
  preset: number[],
  components: MixEditorComponentInput[],
) =>
  preset.length === components.length &&
  preset.every((value, index) => Number(components[index].proportion) === value);

export const MixBuilder = ({
  mode,
  editor,
  tobaccos,
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

  const totalPercent = componentsTotal(editor.components);
  const blockedByStock = editor.components.some((component) => {
    const tobacco = tobaccoMap.get(component.tobaccoId);
    return tobacco ? !tobacco.inStock : false;
  });
  const isValid =
    editor.name.trim().length > 0 && editor.components.length >= 1 && totalPercent === 100;

  const componentsCountLabel = (() => {
    const n = editor.components.length;
    if (n === 1) return '1 табак';
    if (n >= 2 && n <= 4) return `${n} табака`;
    return `${n} табаков`;
  })();

  const applyPreset = (preset: number[]) => {
    if (preset.length !== editor.components.length) return;
    onReplaceComponents(
      editor.components.map((component, index) => ({
        ...component,
        proportion: String(preset[index]),
      })),
    );
  };

  const presetsForCurrent = PRESETS_BY_COUNT[editor.components.length] ?? [];

  const distributeEvenly = () => {
    if (!editor.components.length) return;
    onReplaceComponents(rebalanceTo100(editor.components));
  };

  return (
    <form className="mix-builder mix-builder--mock" onSubmit={onSubmit}>
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
          <span className="mix-builder__breadcrumb-eyebrow">
            {mode === 'edit' ? 'РЕДАКТИРОВАНИЕ МИКСА' : 'НОВЫЙ МИКС'}
          </span>
          <span className="mix-builder__breadcrumb-divider" aria-hidden="true">·</span>
          <span className="mix-builder__breadcrumb-meta">{componentsCountLabel}</span>
          <span className="mix-builder__breadcrumb-divider" aria-hidden="true">·</span>
          <span className="mix-builder__breadcrumb-meta">{totalPercent}%</span>
          {totalPercent === 100 ? (
            <span className="mix-builder__chip mix-builder__chip--success">сумма = 100%</span>
          ) : (
            <span className="mix-builder__chip mix-builder__chip--warning">
              {totalPercent > 100 ? 'переполнено' : `осталось ${100 - totalPercent}%`}
            </span>
          )}
          {blockedByStock ? (
            <span className="mix-builder__chip mix-builder__chip--danger">блокируется наличием</span>
          ) : null}
        </div>
        <div className="mix-builder__actions">
          <label
            className={`mix-builder__visibility ${
              editor.available ? 'mix-builder__visibility--on' : 'mix-builder__visibility--off'
            }`}
            title={editor.available ? 'Виден гостю' : 'Скрыт от гостя'}
          >
            <button
              type="button"
              role="switch"
              aria-checked={editor.available}
              className={`toggle ${editor.available ? 'toggle--on' : 'toggle--off'}`}
              onClick={() => onAvailabilityChange(!editor.available)}
              disabled={saveStatus === 'loading'}
            >
              <span className="toggle__track" aria-hidden="true">
                <span className="toggle__thumb" />
              </span>
            </button>
            <span>Виден гостю</span>
          </label>
          <button
            type="button"
            className="secondary-button secondary-button--inline"
            onClick={onCancel}
          >
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

      <div className="mix-builder__body mix-builder__body--two-col">
        {/* Library (left) */}
        <TobaccoLibrary
          tobaccos={tobaccos}
          currentIds={currentIds}
          onAdd={onAddComponent}
        />

        {/* Preview + composition (right) */}
        <section className="mix-builder__preview mix-builder__preview--mock" aria-label="Карточка микса">
          <div className="mix-builder__title-block">
            <input
              type="text"
              className="mix-builder__title-input"
              value={editor.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              placeholder={mode === 'create' ? 'Название микса' : 'Без названия'}
              aria-label="Название микса"
              autoFocus={mode === 'create'}
            />
            <h2 className="sr-only">{editor.name || 'Без названия'}</h2>
            <textarea
              className="mix-builder__description-input"
              value={editor.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              placeholder="1–2 строки, что почувствует гость"
              rows={2}
              aria-label="Описание для гостя"
            />
          </div>

          <section className="mix-builder__proportions" aria-label="Пропорции состава">
            <header className="mix-builder__proportions-head">
              <span className="mix-builder__section-eyebrow">Пропорции</span>
              <button
                type="button"
                className="mix-builder__distribute"
                onClick={distributeEvenly}
                disabled={!editor.components.length}
                title="Разделить поровну между всеми компонентами"
              >
                <Scale size={14} aria-hidden="true" />
                <span>Распределить поровну</span>
              </button>
            </header>
            <p className="mix-builder__proportions-hint">потяни границы или используй пресеты</p>
            <ProportionBar components={editor.components} onResize={onReplaceComponents} />
            {presetsForCurrent.length ? (
              <div className="mix-builder__presets" role="group" aria-label="Быстрые пресеты пропорций">
                {presetsForCurrent.map((preset) => {
                  const active = presetMatchesComponents(preset, editor.components);
                  const label = formatPresetLabel(preset);
                  return (
                    <button
                      key={`preset:${label}`}
                      type="button"
                      className={`mix-builder__preset${active ? ' mix-builder__preset--active' : ''}`}
                      aria-pressed={active}
                      onClick={() => applyPreset(preset)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="mix-builder__composition" aria-label="Состав микса">
            <header className="mix-builder__composition-head">
              <span className="mix-builder__section-eyebrow">
                Состав <span className="mix-builder__section-count">({editor.components.length})</span>
              </span>
            </header>
            <div className="mix-builder__components">
              {editor.components.length === 0 ? (
                <div className="mix-builder__empty">
                  <strong>Состав пуст</strong>
                  <p>Добавьте табак из библиотеки слева →</p>
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

          {aggregatedProfiles.length ? (
            <section className="mix-builder__profile" aria-label="Вкусовой профиль">
              <span className="mix-builder__section-eyebrow">Профиль</span>
              <div className="mix-builder__profile-chips">
                {aggregatedProfiles.map((profile) => (
                  <span className="mix-builder__chip mix-builder__chip--accent" key={profile}>
                    {profile}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {editor.railMemberships.length > 0 ? (
            <div className="mix-builder__memberships">
              <span className="mix-builder__section-eyebrow">В рейлах</span>
              <ul>
                {editor.railMemberships.map((membership) => (
                  <li key={membership.railId}>{membership.railName}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {saveError ? <p className="error-text">{saveError}</p> : null}
        </section>
      </div>
    </form>
  );
};
