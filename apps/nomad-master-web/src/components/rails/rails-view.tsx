import { useState } from 'react';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import type { MixRecord, RailRecord, RailType } from '@/contracts';
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

const AROMA_WEB_URL = 'http://localhost:5174';

const openGuestShowcase = () => {
  window.open(AROMA_WEB_URL, '_blank', 'noopener,noreferrer');
};

type TagTone = 'info' | 'warning' | 'accent';

const railTypeTone: Record<RailType, TagTone> = {
  statistical: 'info',
  prepared: 'warning',
  curated: 'accent',
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
        <p className="rails-page__eyebrow">Менеджер рейлов</p>
        <h1 className="rails-page__title">Рейлы Nomad</h1>
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
      <p className="rails-page__notice">Загружаем рейлы...</p>
    ) : null}
    {railsError ? <p className="rails-page__notice rails-page__notice--error">{railsError}</p> : null}

    <div className="rails-page__list">
      {rails.map((rail) => {
        const tokens = resolveRailMixTokens(rail, railMixCatalog);
        return (
          <article className="rails-card" key={rail.id}>
            <div className="rails-card__main">
              <div className="rails-card__tags">
                <span className="rails-page__eyebrow rails-card__kicker">Рейл</span>
                <span className="tag" data-tone={railTypeTone[rail.type]}>
                  {formatRailType(rail.type)}
                </span>
                {!rail.editable ? (
                  <span className="tag tag--ghost">только просмотр</span>
                ) : null}
                {rail.active ? (
                  <span className="tag" data-tone="success">активен</span>
                ) : null}
              </div>
              <h3 className="rails-card__name">{rail.name}</h3>
              {rail.description ? (
                <p className="rails-card__description">{rail.description}</p>
              ) : null}
              {tokens.length ? (
                <ul className="rails-card__mixes">
                  {tokens.map((token) => (
                    <li className="rails-card__mix" key={token.id}>
                      <span
                        className={`rails-card__mix-dot rails-card__mix-dot--${token.state}`}
                        aria-hidden="true"
                      />
                      <span className="rails-card__mix-name">{token.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rails-page__notice">Миксы не заданы</p>
              )}
            </div>
            <aside className="rails-card__aside">
              <div className="rails-card__count">
                {rail.mixIds.length} {pluralizeMixCount(rail.mixIds.length)}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => onOpenRail(rail)}
              >
                {rail.editable ? (
                  <Pencil size={14} aria-hidden />
                ) : (
                  <Eye size={14} aria-hidden />
                )}
                {rail.editable ? 'Редактировать' : 'Просмотр'}
              </button>
              {rail.editable ? (
                <button
                  type="button"
                  className="btn"
                  data-variant="danger"
                  title="Удалить"
                  aria-label={`Удалить ${rail.name}`}
                  onClick={() => setRailPendingDelete(rail)}
                >
                  <Trash2 size={14} aria-hidden />
                  Удалить
                </button>
              ) : null}
            </aside>
          </article>
        );
      })}

      {!rails.length && railsStatus !== 'loading' ? (
        <p className="rails-page__notice">Пока нет рейлов.</p>
      ) : null}
    </div>

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
