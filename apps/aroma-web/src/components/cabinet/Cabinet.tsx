import { Chip } from '@/components/aroma';
import type { GuestMe } from '@/lib/guest-session';
import { getProfileColor } from '@/lib/profile-color';
import { profileLabelMap } from '@/lib/profile-labels';

// Кабинет вошедшего гостя (#243, шапка мокапа cab-history). История и
// избранное — #244.
export function Cabinet({
  me,
  loading,
  error,
  notice,
  onEditTastes,
  onLogout,
  onDelete,
}: {
  me: GuestMe | null;
  loading: boolean;
  error: string;
  notice: string;
  onEditTastes: () => void;
  onLogout: () => void;
  onDelete: () => void;
}) {
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
