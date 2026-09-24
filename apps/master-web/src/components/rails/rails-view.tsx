import { useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type { MixRecord, RailRecord } from '@/contracts';
import { formatRailType } from '@/contracts';
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

const AROMA_WEB_URL =
  import.meta.env.VITE_AROMA_WEB_URL ?? 'http://localhost:5174';

const openGuestShowcase = () => {
  window.open(AROMA_WEB_URL, '_blank', 'noopener,noreferrer');
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

  return (
  <section className="rails-page">
    <header className="rails-page__header">
      <div className="rails-page__copy">
        <h1 className="rails-page__title">Рейлы</h1>
        <p className="rails-page__subtitle">
          Состав и порядок подборок для гостевой витрины.
        </p>
      </div>
      <div className="rails-page__actions">
        <button
          type="button"
          className="btn"
          data-variant="ghost"
          onClick={openGuestShowcase}
        >
          <Eye size={14} aria-hidden />
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
      </div>
    </header>

    {railsStatus === 'loading' ? (
      <p className="rails-page__notice">Загружаем рейлы…</p>
    ) : null}
    {railsError ? <p className="rails-page__notice rails-page__notice--error">{railsError}</p> : null}

    {rails.length ? (
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
                      {tokens.length ? (
                        <span className="rails-table__mix-names">
                          {tokens.map((token, index) => (
                            <span key={token.id} data-state={token.state}>
                              {index > 0 ? ' · ' : ''}
                              {token.name}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="rails-table__actions" onClick={(event) => event.stopPropagation()}>
                    <button type="button" className="btn" data-size="sm" onClick={() => onOpenRail(rail)}>
                      {rail.editable ? <Pencil size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
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
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : railsStatus !== 'loading' ? (
      <p className="rails-page__notice">Пока нет рейлов.</p>
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
            Рейл будет удалён без возможности восстановления, а его миксы — убраны из
            этой подборки. Сами миксы останутся в каталоге. Действие необратимо.
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
