import type { MixRecord, RailRecord, RailType } from '@/contracts';
import { formatRailType } from '@/contracts';

const railTypeChipTone: Record<RailType, string> = {
  statistical: 'chip--tone-info',
  prepared: 'chip--tone-warning',
  curated: 'chip--tone-accent',
};

const resolveRailMixSummary = (rail: RailRecord, mixes: MixRecord[]) => {
  if (rail.mixes.length) {
    return rail.mixes.map((mix) => mix.name).join(', ');
  }

  const resolvedNames = rail.mixIds
    .map((mixId) => mixes.find((mix) => mix.id === mixId)?.name ?? mixId)
    .filter(Boolean);

  return resolvedNames.join(', ') || 'Миксы не заданы';
};

type RailsViewProps = {
  rails: RailRecord[];
  railMixCatalog: MixRecord[];
  railsStatus: 'idle' | 'loading' | 'ready' | 'error';
  railsError: string;
  activeEditorId: string;
  onCreateRail: () => void;
  onOpenRail: (rail: RailRecord) => void;
};

export const RailsView = ({
  rails,
  railMixCatalog,
  railsStatus,
  railsError,
  activeEditorId,
  onCreateRail,
  onOpenRail,
}: RailsViewProps) => (
  <section className="card rails-surface">
    <div className="section-head section-head--surface section-head--surface-split rails-surface__header">
      <div className="ops-surface__intro">
        <p className="eyebrow">Менеджер рейлов</p>
        <h2>Рейлы Nomad</h2>
        <p className="meta-line">Состав и порядок показа подборок для гостевой витрины.</p>
      </div>
      <div className="summary-grid summary-grid--nested ops-surface__stats rails-surface__stats">
        <article className="metric-card ops-surface__stat rails-surface__stat">
          <p className="metric-label">Всего рейлов</p>
          <p className="metric-value metric-value--compact">{rails.length}</p>
          <p className="meta-line">Все подборки гостевой витрины.</p>
        </article>
        <article className="metric-card ops-surface__stat rails-surface__stat">
          <p className="metric-label">Активны в витрине</p>
          <p className="metric-value metric-value--compact">{rails.filter((rail) => rail.active).length}</p>
          <p className="meta-line">Показываются гостю сейчас.</p>
        </article>
        <article className="metric-card ops-surface__stat rails-surface__stat">
          <p className="metric-label">Только просмотр</p>
          <p className="metric-value metric-value--compact">{rails.filter((rail) => !rail.editable).length}</p>
          <p className="meta-line">Системные подборки без ручного редактирования.</p>
        </article>
      </div>
    </div>

    <div className="ops-toolbar ops-toolbar--split rails-surface__toolbar">
      <p className="meta-line">Собирай подборки, меняй порядок и быстро отделяй системные рейлы от редактируемых.</p>
      <div className="section-actions">
        <span className="status-chip">Витрина гостя</span>
        <button
          className="primary-button primary-button--inline"
          type="button"
          onClick={onCreateRail}
        >
          Новый рейл
        </button>
      </div>
    </div>

    {railsStatus === 'loading' ? <p className="meta-line">Загружаем рейлы...</p> : null}
    {railsError ? <p className="error-text">{railsError}</p> : null}

    <div className="manager-layout ops-management-grid rails-surface__grid rails-surface__grid--single">
      <aside className="entity-list rails-surface__list">
        {rails.map((rail) => (
          <article
            className={[
              'entity-card',
              'ops-surface__card',
              'rails-surface__card',
              activeEditorId === rail.id ? 'entity-card--active' : '',
              rail.editable ? '' : 'entity-card--muted',
            ].filter(Boolean).join(' ')}
            key={rail.id}
          >
            <div className="entity-card__head">
              <div>
                <p className="entity-kicker">Рейл</p>
                <h3>{rail.name}</h3>
              </div>
              <span className={rail.active ? 'stock-pill stock-pill--in' : 'stock-pill stock-pill--out'}>
                {rail.active ? 'Активен' : 'Неактивен'}
              </span>
            </div>
            <div className="chip-row">
              <span className={`chip ${railTypeChipTone[rail.type]}`}>{formatRailType(rail.type)}</span>
              <span className={rail.editable ? 'chip chip--editable' : 'chip chip--readonly'}>
                {rail.editable ? 'Редактируемый' : 'Только просмотр'}
              </span>
            </div>
            <p className="meta-line">{rail.description || 'Без описания'}</p>
            {!rail.editable && rail.readOnlyReason ? <p className="meta-line">{rail.readOnlyReason}</p> : null}
            <p className="meta-line">Миксы: {resolveRailMixSummary(rail, railMixCatalog)}</p>
            <div className="entity-card__actions">
              <button
                className="secondary-button secondary-button--inline"
                type="button"
                onClick={() => onOpenRail(rail)}
              >
                {rail.editable ? 'Редактировать' : 'Просмотр'}
              </button>
            </div>
          </article>
        ))}

        {!rails.length && railsStatus !== 'loading' ? <p className="meta-line">Пока нет рейлов.</p> : null}
      </aside>
    </div>
  </section>
);
