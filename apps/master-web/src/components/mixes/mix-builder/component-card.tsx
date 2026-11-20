import { Minus, Plus, Trash2 } from 'lucide-react';
import { compositionColor } from './composition-color';
import { componentPercent } from './rebalance';
import type { MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';
import type { InventoryTobacco, MixSubstitution } from '@/contracts';
import { componentShelfState, componentStockNote, type ComponentShelfState } from '@/lib/mix-builder-status';

type ComponentCardProps = {
  component: MixEditorComponentInput;
  index: number;
  tobacco: InventoryTobacco | null;
  shelfStatus: 'active' | 'plan' | undefined;
  onAddToPlan: (tobacco: InventoryTobacco) => void;
  onPercentChange: (nextPercent: number) => void;
  onRemove: () => void;
};

// Полка у табака в составе (#566, #shot=mix-edit): закончившийся подписан отдельно, как раньше.
const ComponentShelf = ({ state, name, onAddToPlan }: { state: ComponentShelfState; name: string; onAddToPlan: () => void }) => {
  if (state === 'in') {
    return (
      <span className="shelf-status">
        <i aria-hidden />
        на полке
      </span>
    );
  }
  if (state === 'plan') {
    return (
      <span className="tag" data-tone="info">
        в плане
      </span>
    );
  }
  if (state === 'none') {
    return (
      <>
        <span className="mix-builder__shelf-none">нет на полке</span>
        <button type="button" className="btn" data-variant="ghost" data-size="sm" aria-label={`В план: ${name}`} onClick={onAddToPlan}>
          В план
        </button>
      </>
    );
  }
  return null;
};

export const ComponentCard = ({ component, index, tobacco, shelfStatus, onAddToPlan, onPercentChange, onRemove }: ComponentCardProps) => {
  const percent = componentPercent(component);
  const swatch = (
    <span
      className="mix-builder__component-swatch"
      style={{ background: compositionColor(index) }}
      aria-hidden="true"
    />
  );

  const step = (delta: number) => onPercentChange(Math.max(1, Math.min(99, percent + delta)));

  if (!tobacco) {
    return (
      <div className="mix-builder__component mix-builder__component--missing">
        {swatch}
        <div className="mix-builder__component-main">
          <div className="mix-builder__component-name">Табак не найден ({component.tobaccoId})</div>
          <div className="mix-builder__component-sub">Возможно, удалён из каталога</div>
        </div>
        <div className="mix-builder__component-prop">
          <div className="mix-builder__prop-input">
            <button type="button" className="mix-builder__prop-step" onClick={() => step(-5)} aria-label="−5%">
              <Minus size={12} aria-hidden="true" />
            </button>
            <input
              type="number"
              min={1}
              max={99}
              value={percent}
              onChange={(event) => {
                const v = parseInt(event.target.value, 10);
                if (!Number.isNaN(v)) onPercentChange(Math.max(1, Math.min(99, v)));
              }}
            />
            <span className="mix-builder__prop-suffix">%</span>
            <button type="button" className="mix-builder__prop-step" onClick={() => step(5)} aria-label="+5%">
              <Plus size={12} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="mix-builder__component-remove" onClick={onRemove} aria-label="Убрать табак из состава">
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const shelf = componentShelfState(tobacco.inStock, shelfStatus);
  return (
    <div className="mix-builder__component">
      {swatch}
      <div className="mix-builder__component-main">
        <div className="mix-builder__component-name">
          {tobacco.name}
          {shelf === 'out' ? (
            <span className="mix-builder__component-badge mix-builder__component-badge--warning">нет в наличии</span>
          ) : null}
        </div>
        <div className="mix-builder__component-sub">
          {tobacco.lineName ? `${tobacco.manufacturer} ${tobacco.lineName}` : tobacco.manufacturer}
          {tobacco.flavors?.length ? (
            <span className="mix-builder__flavors">{tobacco.flavors.slice(0, 3).join(', ')}</span>
          ) : null}
        </div>
      </div>
      <div className="mix-builder__component-prop">
        <span className="mix-builder__component-shelf">
          <ComponentShelf state={shelf} name={tobacco.name} onAddToPlan={() => onAddToPlan(tobacco)} />
        </span>
        <div className="mix-builder__prop-input">
          <button type="button" className="mix-builder__prop-step" onClick={() => step(-5)} aria-label="−5%">
            <Minus size={12} aria-hidden="true" />
          </button>
          <input
            type="number"
            min={1}
            max={99}
            value={percent}
            onChange={(event) => {
              const v = parseInt(event.target.value, 10);
              if (!Number.isNaN(v)) onPercentChange(Math.max(1, Math.min(99, v)));
            }}
            aria-label={`Доля табака ${tobacco.name} в процентах`}
          />
          <span className="mix-builder__prop-suffix">%</span>
          <button type="button" className="mix-builder__prop-step" onClick={() => step(5)} aria-label="+5%">
            <Plus size={12} aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="mix-builder__component-remove" onClick={onRemove} aria-label={`Убрать табак ${tobacco.name} из состава`}>
          <Trash2 size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

type PhoneComponentCardProps = ComponentCardProps & {
  missingIds: string[];
  substitution: MixSubstitution | null;
};

// Телефон (#540, #shot=mix-edit-scrolled): степпер ±5 под палец, что увидит гость — строкой под табаком.
export const PhoneComponentCard = ({
  component,
  index,
  tobacco,
  shelfStatus,
  onAddToPlan,
  missingIds,
  substitution,
  onPercentChange,
  onRemove,
}: PhoneComponentCardProps) => {
  const percent = componentPercent(component);
  const step = (delta: number) => onPercentChange(Math.max(1, Math.min(99, percent + delta)));
  const name = tobacco?.name ?? 'Табак не найден';
  const shelf = tobacco ? componentShelfState(tobacco.inStock, shelfStatus) : null;
  const note = tobacco && shelf === 'out' ? componentStockNote(tobacco.id, tobacco.inStock, missingIds, substitution) : null;
  return (
    <div className="mix-builder__phone-component" data-missing={!tobacco || undefined}>
      <div className="mix-builder__phone-component-who">
        <b>
          <span className="mix-builder__component-swatch" style={{ background: compositionColor(index) }} aria-hidden="true" />
          {name}
        </b>
        <span>{tobacco ? (tobacco.lineName ? `${tobacco.manufacturer} ${tobacco.lineName}` : tobacco.manufacturer) : 'Возможно, удалён из каталога'}</span>
      </div>
      <div className="mix-builder__phone-step">
        <button type="button" onClick={() => step(-5)} aria-label={`${name}: меньше на 5 %`}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={99}
          value={percent}
          onChange={(event) => {
            const v = parseInt(event.target.value, 10);
            if (!Number.isNaN(v)) onPercentChange(Math.max(1, Math.min(99, v)));
          }}
          aria-label={`Доля табака ${name} в процентах`}
        />
        <button type="button" onClick={() => step(5)} aria-label={`${name}: больше на 5 %`}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <button type="button" className="icon-btn mix-builder__phone-remove" onClick={onRemove} aria-label={`Убрать табак ${name} из состава`}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
      {note ? (
        <p className="mix-builder__phone-note" data-tone={note.tone}>
          {note.text}
        </p>
      ) : null}
      {tobacco && (shelf === 'plan' || shelf === 'none') ? (
        <p className="mix-builder__phone-note mix-builder__phone-shelf">
          <ComponentShelf state={shelf} name={name} onAddToPlan={() => onAddToPlan(tobacco)} />
        </p>
      ) : null}
    </div>
  );
};
