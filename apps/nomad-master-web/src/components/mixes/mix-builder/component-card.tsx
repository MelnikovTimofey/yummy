import { Minus, Plus, Trash2 } from 'lucide-react';
import { colorForTobacco } from './color-for-tobacco';
import { componentPercent } from './rebalance';
import type { MixEditorComponentInput } from '@/components/mixes/mix-catalog-view';
import type { InventoryTobacco } from '@/contracts';

type ComponentCardProps = {
  component: MixEditorComponentInput;
  tobacco: InventoryTobacco | null;
  onPercentChange: (nextPercent: number) => void;
  onRemove: () => void;
};

const brandShort = (manufacturer: string) =>
  manufacturer
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '·';

export const ComponentCard = ({ component, tobacco, onPercentChange, onRemove }: ComponentCardProps) => {
  const percent = componentPercent(component);
  const color = colorForTobacco(component.tobaccoId);

  const step = (delta: number) => onPercentChange(Math.max(1, Math.min(99, percent + delta)));

  if (!tobacco) {
    return (
      <div className="mix-builder__component mix-builder__component--missing" style={{ borderLeftColor: color.fill }}>
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

  return (
    <div className="mix-builder__component" style={{ borderLeftColor: color.fill }}>
      <div className="mix-builder__component-brand" aria-hidden="true">
        {brandShort(tobacco.manufacturer)}
      </div>
      <div className="mix-builder__component-main">
        <div className="mix-builder__component-name">
          {tobacco.name}
          {!tobacco.inStock ? (
            <span className="mix-builder__component-badge mix-builder__component-badge--danger">нет в наличии</span>
          ) : null}
        </div>
        <div className="mix-builder__component-sub">
          {tobacco.manufacturer}
          {tobacco.lineName ? ` · ${tobacco.lineName}` : ''}
          {tobacco.flavors?.length ? ` · ${tobacco.flavors.slice(0, 3).join(', ')}` : ''}
        </div>
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
