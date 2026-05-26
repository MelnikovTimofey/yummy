import type { MixRecord, RailRecord, RailType } from '@/contracts';
import { formatRailType } from '@/contracts';
import { MasterPageHeader } from '@/components/shell/master-page-header';
import { MasterStatsRow } from '@/components/shell/master-stats-row';

const railTypeChipTone: Record<RailType, string> = {
  statistical: 'chip--tone-info',
  prepared: 'chip--tone-warning',
  curated: 'chip--tone-accent',
};

const pluralizeMixCount = (count: number) => {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return 'миксов';
  const last = count % 10;
  if (last === 1) return 'микс';
  if (last >= 2 && last <= 4) return 'микса';
  return 'миксов';
};

type RailMixToken = {
  id: string;
  name: string;
  state: 'active' | 'hidden';
};

const resolveRailMixTokens = (rail: RailRecord, mixes: MixRecord[]): RailMixToken[] => {
  if (rail.mixes.length) {
    return rail.mixes.map((mix) => ({
      id: mix.id,
      name: mix.name,
      state: mix.guestVisible && mix.available ? 'active' : 'hidden',
    }));
  }

  return rail.mixIds.map((mixId) => {
    const resolved = mixes.find((mix) => mix.id === mixId);
    if (!resolved) {
      return { id: mixId, name: mixId, state: 'hidden' as const };
    }
    return {
      id: resolved.id,
      name: resolved.name,
      state: resolved.guestVisible && resolved.available ? 'active' : 'hidden',
    };
  });
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
    <MasterPageHeader
      eyebrow="МЕНЕДЖЕР РЕЙЛОВ"
      title="Рейлы Nomad"
      subtitle="Состав и порядок подборок для гостевой витрины."
      actions={
        <button
          className="primary-button primary-button--inline"
          type="button"
          onClick={onCreateRail}
        >
          Новый рейл
        </button>
      }
    />

    <MasterStatsRow
      tiles={[
        {
          label: 'Всего рейлов',
          value: rails.length,
          hint: 'все подборки витрины',
        },
        {
          label: 'Активны в витрине',
          value: rails.filter((rail) => rail.active).length,
          hint: 'показываются гостю',
          tone: 'success',
        },
        {
          label: 'Только просмотр',
          value: rails.filter((rail) => !rail.editable).length,
          hint: 'системные, без ручной правки',
        },
      ]}
    />

    {railsStatus === 'loading' ? <p className="meta-line">Загружаем рейлы...</p> : null}
    {railsError ? <p className="error-text">{railsError}</p> : null}

    <div className="manager-layout ops-management-grid rails-surface__grid rails-surface__grid--single">
      <aside className="entity-list rails-surface__list">
        {rails.map((rail) => {
          const mixTokens = resolveRailMixTokens(rail, railMixCatalog);
          return (
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
              <div className="rails-surface__card-main">
                <div className="rails-surface__card-tags">
                  <span className="entity-kicker rails-surface__card-kicker">Рейл</span>
                  <span className={`chip ${railTypeChipTone[rail.type]}`}>{formatRailType(rail.type)}</span>
                  {!rail.editable ? <span className="chip chip--ghost">только просмотр</span> : null}
                  {rail.active ? <span className="chip chip--tone-success">активен</span> : null}
                </div>
                <h3 className="rails-surface__card-name">{rail.name}</h3>
                {rail.description ? (
                  <p className="rails-surface__card-description">{rail.description}</p>
                ) : null}
                {!rail.editable && rail.readOnlyReason ? (
                  <p className="meta-line rails-surface__card-readonly-reason">{rail.readOnlyReason}</p>
                ) : null}
                {mixTokens.length ? (
                  <ul className="rails-surface__mix-tokens">
                    {mixTokens.map((token) => (
                      <li className="rails-surface__mix-token" key={token.id}>
                        <span
                          className={`rails-surface__mix-dot rails-surface__mix-dot--${token.state}`}
                          aria-hidden="true"
                        />
                        <span className="rails-surface__mix-token-name">{token.name}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="meta-line">Миксы не заданы</p>
                )}
              </div>
              <div className="rails-surface__card-aside">
                <span className="rails-surface__mix-count">
                  {rail.mixIds.length} {pluralizeMixCount(rail.mixIds.length)}
                </span>
                <button
                  className="secondary-button secondary-button--inline rails-surface__card-action"
                  type="button"
                  onClick={() => onOpenRail(rail)}
                >
                  {rail.editable ? 'Редактировать' : 'Просмотр'}
                </button>
              </div>
            </article>
          );
        })}

        {!rails.length && railsStatus !== 'loading' ? <p className="meta-line">Пока нет рейлов.</p> : null}
      </aside>
    </div>
  </section>
);
