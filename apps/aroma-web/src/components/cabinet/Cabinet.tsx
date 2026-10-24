import { useState } from 'react';

import { BusyLabel, Chip, Loading, MixRowsSkeleton, SegmentNav, Sk } from '@/components/aroma';
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

  const renderHistory = () => {
    if (history.status === 'loading' && !history.items.length) {
      return (
        <Loading label="Загружаем историю">
          <MixRowsSkeleton count={4} />
        </Loading>
      );
    }
    if (history.status === 'error' && !history.items.length) {
      return (
        <p className="cab-error cab-error-start" role="alert">
          Историю не получилось загрузить. Откройте кабинет ещё раз.
        </p>
      );
    }
    if (!history.items.length) {
      return <CabinetEmpty text="Здесь появятся миксы, которые вы выберете." onGoRecs={onGoRecs} />;
    }
    return (
      <div className="cab-list">
        {groupHistory(history.items, new Date()).map((group) => (
          <section key={group.key} className="cab-group" aria-label={group.label}>
            <h2 className="cab-label">{group.label}</h2>
            {group.items.map((item) => (
              <CabinetRow key={item.id} item={item} onOpen={() => onOpen(item, 'history')} />
            ))}
          </section>
        ))}
        {history.nextBefore ? (
          <button
            type="button"
            className="cab-ghost-sm cab-more busy-inline"
            onClick={history.loadingMore ? undefined : onMoreHistory}
            aria-busy={history.loadingMore || undefined}
          >
            <BusyLabel busy={history.loadingMore}>Показать раньше</BusyLabel>
          </button>
        ) : null}
      </div>
    );
  };

  const renderFavorites = () => {
    if (favorites === null) {
      return (
        <Loading label="Загружаем избранное">
          <MixRowsSkeleton count={4} />
        </Loading>
      );
    }
    if (!favorites.length) {
      return <CabinetEmpty text="Здесь появятся миксы, отмеченные сердечком." onGoRecs={onGoRecs} />;
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
          <h2 className="cab-label">Ваши вкусы</h2>
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
        <Loading label="Загружаем кабинет">
          <Sk className="sk-title" style={{ width: '55%' }} />
          <Sk className="sk-line" style={{ width: '35%' }} />
        </Loading>
      ) : null}

      {error ? (
        <p className="cab-error cab-error-start" role="alert">
          {error}
        </p>
      ) : null}

      <SegmentNav
        items={[
          { id: 'history', label: 'История' },
          { id: 'favorites', label: 'Избранное' },
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
