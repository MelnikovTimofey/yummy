import { useEffect, useMemo, useState } from 'react';
import {
  getManufacturers,
  getPreferenceProfile,
  upsertPreferenceProfile,
} from '../shared/apiClient';
import { AuthState, FlavorProfile, Manufacturer } from '../shared/types';

type ProfileScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
  onPreferencesSaved: () => void;
  onSignOut: () => void;
  onOpenFavorites: () => void;
  onOpenSessions: () => void;
  onOpenAddMix: () => void;
};

const FLAVOR_OPTIONS: Array<{ value: FlavorProfile; label: string }> = [
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
];

export const ProfileScreen = ({
  authState,
  onAuthUpdate,
  onPreferencesSaved,
  onSignOut,
  onOpenFavorites,
  onOpenSessions,
  onOpenAddMix,
}: ProfileScreenProps) => {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [likedProfiles, setLikedProfiles] = useState<FlavorProfile[]>([]);
  const [dislikedProfiles, setDislikedProfiles] = useState<FlavorProfile[]>([]);
  const [favoriteManufacturerIds, setFavoriteManufacturerIds] = useState<string[]>([]);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!authState.tokens) {
        return;
      }

      setStatus('loading');
      setFeedback(null);
      try {
        const [manufacturersRes, profileRes] = await Promise.all([
          getManufacturers(),
          getPreferenceProfile(authState.tokens, onAuthUpdate),
        ]);

        setManufacturers(manufacturersRes.items);

        if (profileRes.profile) {
          setLikedProfiles(profileRes.profile.likedProfiles);
          setDislikedProfiles(profileRes.profile.dislikedProfiles);
          setFavoriteManufacturerIds(profileRes.profile.favoriteManufacturerIds);
        }

        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate]);

  const toggleLikedProfile = (profile: FlavorProfile) => {
    setLikedProfiles((current) =>
      current.includes(profile) ? current.filter((item) => item !== profile) : [...current, profile],
    );
    setDislikedProfiles((current) => current.filter((item) => item !== profile));
  };

  const toggleDislikedProfile = (profile: FlavorProfile) => {
    setDislikedProfiles((current) =>
      current.includes(profile) ? current.filter((item) => item !== profile) : [...current, profile],
    );
    setLikedProfiles((current) => current.filter((item) => item !== profile));
  };

  const toggleManufacturer = (manufacturerId: string) => {
    setFavoriteManufacturerIds((current) =>
      current.includes(manufacturerId)
        ? current.filter((item) => item !== manufacturerId)
        : [...current, manufacturerId],
    );
  };

  const onSave = async () => {
    if (!authState.tokens) {
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      const response = await upsertPreferenceProfile(authState.tokens, onAuthUpdate, {
        likedProfiles,
        dislikedProfiles,
        favoriteManufacturerIds,
      });

      setLikedProfiles(response.profile.likedProfiles);
      setDislikedProfiles(response.profile.dislikedProfiles);
      setFavoriteManufacturerIds(response.profile.favoriteManufacturerIds);
      setFeedback('Профиль предпочтений сохранён. Рекомендации обновлены.');
      onPreferencesSaved();
    } catch {
      setFeedback('Не удалось сохранить предпочтения.');
    } finally {
      setSaving(false);
    }
  };

  const favoriteCountLabel = useMemo(
    () => `${favoriteManufacturerIds.length} брендов выбрано`,
    [favoriteManufacturerIds.length],
  );

  return (
    <section className="profile-layout">
      <section className="card">
        <p className="card-title">Аккаунт</p>
        <p className="card-text">{authState.user?.email ?? 'Пользователь'}</p>
        <div className="profile-nav-grid">
          <button
            type="button"
            className="ghost-button profile-nav-btn"
            onClick={() => setPreferencesOpen((current) => !current)}
          >
            {preferencesOpen ? 'Скрыть предпочтения' : 'Предпочтения'}
          </button>
          <button type="button" className="ghost-button profile-nav-btn" onClick={onOpenFavorites}>
            Избранное
          </button>
          <button type="button" className="ghost-button profile-nav-btn" onClick={onOpenSessions}>
            Сессии курения
          </button>
          <button type="button" className="ghost-button profile-nav-btn" onClick={onOpenAddMix}>
            Добавить микс
          </button>
        </div>
        <button type="button" className="ghost-button" onClick={onSignOut}>
          Выйти
        </button>
      </section>

      {preferencesOpen ? (
        <>
          <section className="card">
            <p className="card-title">Любимые профили</p>
            <div className="chip-grid">
              {FLAVOR_OPTIONS.map((option) => (
                <button
                  key={`liked:${option.value}`}
                  type="button"
                  className={`option-chip ${likedProfiles.includes(option.value) ? 'liked' : ''}`}
                  onClick={() => toggleLikedProfile(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <p className="card-title">Нелюбимые профили</p>
            <div className="chip-grid">
              {FLAVOR_OPTIONS.map((option) => (
                <button
                  key={`disliked:${option.value}`}
                  type="button"
                  className={`option-chip ${dislikedProfiles.includes(option.value) ? 'disliked' : ''}`}
                  onClick={() => toggleDislikedProfile(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <p className="card-title">Любимые бренды</p>
            <p className="hint">{favoriteCountLabel}</p>
            {status === 'loading' ? <p className="screen-status">Загрузка брендов...</p> : null}
            {status === 'error' ? <p className="screen-status error">Не удалось загрузить бренды.</p> : null}
            <div className="chip-grid">
              {manufacturers.map((manufacturer) => (
                <button
                  key={manufacturer.id}
                  type="button"
                  className={`option-chip ${favoriteManufacturerIds.includes(manufacturer.id) ? 'favorite' : ''}`}
                  onClick={() => toggleManufacturer(manufacturer.id)}
                >
                  {manufacturer.name}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <button
              type="button"
              className="search-button profile-save"
              onClick={onSave}
              disabled={saving}
            >
              Сохранить и обновить рекомендации
            </button>
            {feedback ? <p className="hint">{feedback}</p> : null}
          </section>
        </>
      ) : null}
    </section>
  );
};
