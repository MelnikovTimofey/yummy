import { useState } from 'react';
import { Ellipsis, Plus, Trash2 } from 'lucide-react';
import type { MixRecord, RailRecord } from '@/contracts';
import { formatRailType } from '@/contracts';
import { useIsPhone } from '@/hooks/use-is-phone';
import { formatRailMixCount, pluralizeMixCount } from '@/lib/rails';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RowsSkeleton } from '@/components/ui/loading';

const AROMA_WEB_URL =
  import.meta.env.VITE_AROMA_WEB_URL ?? 'http://localhost:5174';

const openGuestShowcase = () => {
  window.open(AROMA_WEB_URL, '_blank', 'noopener,noreferrer');
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

const RailMixNames = ({ tokens, className }: { tokens: RailMixToken[]; className: string }) => (
  <span className={className}>
    {tokens.map((token, index) => (
      <span key={token.id}>
        {index > 0 ? ', ' : ''}
        <span data-state={token.state}>{token.name}</span>
      </span>
    ))}
  </span>
);

// «Рейлы» на телефоне (#338, #shot=rails): карточки вместо таблицы, касание
// открывает рейл, удаление — в «⋯».
const RailsMobileList = ({
  rails,
  railMixCatalog,
  onOpenRail,
  onAskDelete,
}: {
  rails: RailRecord[];
  railMixCatalog: MixRecord[];
  onOpenRail: (rail: RailRecord) => void;
  onAskDelete: (rail: RailRecord) => void;
}) => {
  const [menuRail, setMenuRail] = useState<RailRecord | null>(null);

  return (
    <>
      <ul className="m-rail-list" aria-label="Рейлы">
        {rails.map((rail) => {
          const tokens = resolveRailMixTokens(rail, railMixCatalog);
          return (
            <li key={rail.id} className="m-rail-card" data-rail-id={rail.id} data-inactive={!rail.active || undefined}>
              <button type="button" className="m-rail-card__open" onClick={() => onOpenRail(rail)}>
                <b className="m-rail-card__name">{rail.name}</b>
                {rail.description ? <span className="m-rail-card__desc">{rail.description}</span> : null}
                <span className="m-rail-card__foot">
                  <span className="m-rail-card__tags">
                    <span className="tag tag--ghost">{formatRailType(rail.type)}</span>
                    {!rail.active ? <span className="tag tag--ghost">выключен</span> : null}
                  </span>
                  <span className="m-rail-card__count">{formatRailMixCount(rail.mixIds.length)}</span>
                </span>
                {tokens.length ? <RailMixNames tokens={tokens} className="m-rail-card__mixes" /> : null}
              </button>
              {rail.editable ? (
                <button
                  type="button"
                  className="m-rail-card__more"
                  aria-label={`Действия: ${rail.name}`}
                  onClick={() => setMenuRail(rail)}
                >
                  <Ellipsis size={18} aria-hidden />
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {menuRail ? (
        <BottomSheet label={`Действия: ${menuRail.name}`} onClose={() => setMenuRail(null)} className="m-actions">
          <div className="m-mark-sheet__head">
            <h2 className="m-mark-sheet__title">{menuRail.name}</h2>
          </div>
          <div className="m-actions__list">
            <button
              type="button"
              className="m-actions__item"
              onClick={() => {
                setMenuRail(null);
                onOpenRail(menuRail);
              }}
            >
              Редактировать
            </button>
            <button
              type="button"
              className="m-actions__item m-actions__item--sep"
              onClick={() => {
                setMenuRail(null);
                onAskDelete(menuRail);
              }}
            >
              Удалить рейл
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </>
  );
};

type RailsViewProps = {
  rails: RailRecord[];
  railMixCatalog: MixRecord[];
  railsStatus: 'idle' | 'loading' | 'ready' | 'error';
  railsError: string;
  activeEditorId: string;
  onCreateRail: () => void;
  onOpenRail: (rail: RailRecord) => void;
  onDeleteRail: (rail: RailRecord) => void;
};

export const RailsView = ({
  rails,
  railMixCatalog,
  railsStatus,
  railsError,
  onCreateRail,
  onOpenRail,
  onDeleteRail,
}: RailsViewProps) => {
  const [railPendingDelete, setRailPendingDelete] = useState<RailRecord | null>(null);
  const isPhone = useIsPhone();

  return (
  <section className="rails-page">
    <header className="rails-page__header">
      <div className="rails-page__copy">
        <h1 className="rails-page__title">Рейлы</h1>
      </div>
      {/* На телефоне «Новый» — в верхней панели (#shot=rails). */}
      {isPhone ? null : <div className="rails-page__actions">
        <button
          type="button"
          className="btn"
          data-variant="ghost"
          onClick={openGuestShowcase}
        >
          Витрина гостя
        </button>
        <button
          type="button"
          className="btn"
          data-variant="primary"
          onClick={onCreateRail}
        >
          <Plus size={14} aria-hidden />
          Новый рейл
        </button>
      </div>}
    </header>

    {railsStatus === 'loading' && !rails.length ? (
      <RowsSkeleton label="Загружаем рейлы" rows={4} />
    ) : null}
    {railsError ? <p className="rails-page__notice rails-page__notice--error">{railsError}</p> : null}

    {rails.length && isPhone ? (
      <RailsMobileList
        rails={rails}
        railMixCatalog={railMixCatalog}
        onOpenRail={onOpenRail}
        onAskDelete={setRailPendingDelete}
      />
    ) : rails.length ? (
      <div className="rails-table-shell">
        <table className="rails-table">
          <thead>
            <tr>
              <th scope="col">Рейл</th>
              <th scope="col">Тип</th>
              <th scope="col">Миксы</th>
              <th scope="col" className="rails-table__actions-col">
                <span className="sr-only">Действия</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rails.map((rail) => {
              const tokens = resolveRailMixTokens(rail, railMixCatalog);
              return (
                <tr
                  key={rail.id}
                  className="rails-table__row"
                  data-inactive={!rail.active || undefined}
                  onClick={() => onOpenRail(rail)}
                >
                  <td>
                    <div className="rails-table__name">
                      <strong>{rail.name}</strong>
                      {!rail.active ? <span className="tag tag--ghost">выключен</span> : null}
                    </div>
                    {rail.description ? (
                      <p className="rails-table__description">{rail.description}</p>
                    ) : null}
                  </td>
                  <td>
                    <div className="rails-table__type">
                      <span>{formatRailType(rail.type)}</span>
                      {!rail.editable ? <span className="rails-table__faint">только просмотр</span> : null}
                    </div>
                  </td>
                  <td>
                    <div className="rails-table__mixes">
                      <span className="rails-table__count">
                        {rail.mixIds.length} {pluralizeMixCount(rail.mixIds.length)}
                      </span>
                      {tokens.length ? <RailMixNames tokens={tokens} className="rails-table__mix-names" /> : null}
                    </div>
                  </td>
                  <td className="rails-table__actions" onClick={(event) => event.stopPropagation()}>
                    <div className="rails-table__action-group">
                      <button type="button" className="btn" data-size="sm" onClick={() => onOpenRail(rail)}>
                        {rail.editable ? 'Редактировать' : 'Просмотр'}
                      </button>
                      {rail.editable ? (
                        <button
                          type="button"
                          className="btn"
                          data-variant="ghost"
                          data-size="sm"
                          title="Удалить"
                          aria-label={`Удалить ${rail.name}`}
                          onClick={() => setRailPendingDelete(rail)}
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : railsStatus !== 'loading' ? (
      <p className="rails-page__notice">Рейлов пока нет.</p>
    ) : null}

    <Dialog
      open={railPendingDelete !== null}
      onOpenChange={(next) => {
        if (!next) setRailPendingDelete(null);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Удалить рейл «{railPendingDelete?.name}»?</DialogTitle>
          <DialogDescription>
            Рейл удалится насовсем. Миксы останутся в каталоге.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Отмена</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={() => {
              if (railPendingDelete) {
                onDeleteRail(railPendingDelete);
              }
              setRailPendingDelete(null);
            }}
          >
            Удалить рейл
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </section>
  );
};
