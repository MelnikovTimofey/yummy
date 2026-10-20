import { useState } from 'react';

import { Chip, SegmentNav } from '@/components/aroma';
import { favoriteKey, groupHistory, type GuestCabinetItem, type GuestFavoriteItem, type GuestHistoryItem } from '@/lib/cabinet';
import type { GuestMe } from '@/lib/guest-session';
import { getProfileColor } from '@/lib/profile-color';
import { profileLabelMap } from '@/lib/profile-labels';

import { CabinetRow } from './CabinetRow';

export type CabinetHistory = {
  items: GuestHistoryItem[];
  nextBefore: string | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  loadingMore: boolean;
};

export type CabinetListSource = 'history' | 'favorites';

function CabinetEmpty({ text, onGoRecs }: { text: string; onGoRecs: () => void }) {
  return (
    <div className="cab-empty">
      <p className="cab-empty-text">{text}</p>
      <button type="button" className="cab-ghost-sm" onClick={onGoRecs}>
        Открыть подбор
      </button>
    </div>
  );
}

// Кабинет вошедшего гостя (#243, #244; мокапы cab-history, cab-favorites, cab-empty).
export function Cabinet({
  me,
  loading,
  error,
  notice,
  history,
  favorites,
  onOpen,
  onMoreHistory,
  onGoRecs,
  onEditTastes,
  onLogout,
  onDelete,
}: {
  me: GuestMe | null;
  loading: boolean;
  error: string;
  notice: string;
  history: CabinetHistory;
  favorites: GuestFavoriteItem[] | null;
  onOpen: (item: GuestCabinetItem, source: CabinetListSource) => void;
  onMoreHistory: () => void;
  onGoRecs: () => void;
  onEditTastes: () => void;
  onLogout: () => void;
  onDelete: () => void;
}) {
  const [tab, setTab] = useState<CabinetListSource>('history');
  // История приходит страницами по 50, поэтому счётчик — из /guest/me.
  const historyCount = Math.max(me?.historyCount ?? 0, history.items.length);
  const favoritesCount = favorites?.length ?? me?.favoritesCount ?? 0;

  const renderHistory = () => {
    if (history.status === 'loading' && !history.items.length) {
      return <p className="cab-anon-note">Загружаем историю…</p>;
    }
    if (history.status === 'error' && !history.items.length) {
      return (
        <p className="cab-error cab-error-start" role="alert">
          Историю не получилось загрузить. Откройте кабинет ещё раз.
        </p>
      );
    }
    if (!history.items.length) {
      return <CabinetEmpty text="Вы ещё ничего не выбирали. Нажмёте «Покурить» — микс появится здесь." onGoRecs={onGoRecs} />;
    }
    return (
      <div className="cab-list">
        {groupHistory(history.items, new Date()).map((group) => (
          <section key={group.key} className="cab-group" aria-label={group.label}>
            <p className="aroma-caps">{group.label}</p>
            {group.items.map((item) => (
              <CabinetRow key={item.id} item={item} onOpen={() => onOpen(item, 'history')} />
            ))}
          </section>
        ))}
        {history.nextBefore ? (
          <button type="button" className="cab-ghost-sm cab-more" onClick={onMoreHistory} disabled={history.loadingMore}>
            {history.loadingMore ? 'Загружаем…' : 'Показать раньше'}
          </button>
        ) : null}
      </div>
    );
  };

  const renderFavorites = () => {
    if (favorites === null) {
      return <p className="cab-anon-note">Загружаем избранное…</p>;
    }
    if (!favorites.length) {
      return <CabinetEmpty text="Пока пусто. Сердечко на карточке микса — и он здесь." onGoRecs={onGoRecs} />;
    }
    return (
      <div className="cab-list cab-group">
        {favorites.map((item) => (
          <CabinetRow key={favoriteKey(item.ref) ?? item.id} item={item} onOpen={() => onOpen(item, 'favorites')} />
        ))}
      </div>
    );
  };

  return (
    <section className="cab">
      {notice ? (
        <p className="cab-toast" role="status">
          {notice}
        </p>
      ) : null}
      <h1 className="cab-title">Кабинет</h1>

      {me ? (
        <section className="cab-tastes">
          <p className="aroma-caps">Ваши вкусы</p>
          {me.likedProfiles.length || me.likedFlavors.length ? (
            <div className="cab-tastes-row">
              {me.likedProfiles.map((profile) => (
                <Chip key={`profile-${profile}`} active color={getProfileColor(profile)}>
                  {profileLabelMap[profile] ?? profile}
                </Chip>
              ))}
              {me.likedFlavors.map((flavor) => (
                <Chip key={`flavor-${flavor}`}>{flavor}</Chip>
              ))}
            </div>
          ) : (
            <p className="cab-anon-note">Вкусы ещё не выбраны.</p>
          )}
          <button type="button" className="aroma-onboarding-skip cab-tastes-edit" onClick={onEditTastes}>
            Изменить вкусы
          </button>
        </section>
      ) : loading ? (
        <p className="cab-anon-note">Загружаем кабинет…</p>
      ) : null}

      {error ? (
        <p className="cab-error cab-error-start" role="alert">
          {error}
        </p>
      ) : null}

      <SegmentNav
        items={[
          { id: 'history', label: `История · ${historyCount}` },
          { id: 'favorites', label: `Избранное · ${favoritesCount}` },
        ]}
        value={tab}
        onChange={(id) => setTab(id as CabinetListSource)}
      />
      {tab === 'history' ? renderHistory() : renderFavorites()}

      <footer className="cab-foot">
        <button type="button" className="aroma-onboarding-skip" onClick={onLogout}>
          Выйти
        </button>
        <button type="button" className="aroma-onboarding-skip cab-danger-link" onClick={onDelete}>
          Удалить кабинет
        </button>
      </footer>
    </section>
  );
}
