import { useEffect, useMemo, useState } from 'react';
import {
  getManufacturers,
  getMixes,
  getMixRatings,
  getMixRatingSummaries,
  getTobaccos,
} from '../shared/apiClient';
import {
  AuthState,
  FlavorProfile,
  Manufacturer,
  Mix,
  MixRating,
  MixRatingSummary,
  Tobacco,
} from '../shared/types';

type MixesScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

const PROFILE_OPTIONS: Array<{ value: '' | FlavorProfile; label: string }> = [
  { value: '', label: 'Все профили' },
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
];

export const MixesScreen = ({ authState, onAuthUpdate }: MixesScreenProps) => {
  const [items, setItems] = useState<Mix[]>([]);
  const [ratings, setRatings] = useState<Record<string, MixRating>>({});
  const [summaries, setSummaries] = useState<Record<string, MixRatingSummary>>({});
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [tobaccos, setTobaccos] = useState<Tobacco[]>([]);
  const [ownOnly, setOwnOnly] = useState(false);
  const [manufacturerId, setManufacturerId] = useState('');
  const [tobaccoId, setTobaccoId] = useState('');
  const [profile, setProfile] = useState<'' | FlavorProfile>('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    getManufacturers()
      .then((response) => setManufacturers(response.items))
      .catch(() => setManufacturers([]));
  }, []);

  useEffect(() => {
    getTobaccos({ manufacturerId: manufacturerId || undefined, limit: 200 })
      .then((response) => {
        setTobaccos(response.items);
        setTobaccoId((current) =>
          current && !response.items.some((item) => item.id === current) ? '' : current,
        );
      })
      .catch(() => setTobaccos([]));
  }, [manufacturerId]);

  useEffect(() => {
    const loadRatings = async () => {
      if (!authState.tokens) {
        return;
      }

      try {
        const [ratingsRes, summariesRes] = await Promise.all([
          getMixRatings(authState.tokens, onAuthUpdate),
          getMixRatingSummaries(authState.tokens, onAuthUpdate),
        ]);

        setRatings(
          ratingsRes.items.reduce<Record<string, MixRating>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
        setSummaries(
          summariesRes.items.reduce<Record<string, MixRatingSummary>>((acc, item) => {
            acc[item.mixId] = item;
            return acc;
          }, {}),
        );
      } catch {
        setRatings({});
        setSummaries({});
      }
    };

    void loadRatings();
  }, [authState.tokens, onAuthUpdate]);

  useEffect(() => {
    const load = async () => {
      if (!authState.tokens) {
        return;
      }

      setStatus('loading');
      try {
        const mixesRes = await getMixes(authState.tokens, onAuthUpdate, {
          authorId: ownOnly ? authState.user?.id : undefined,
          manufacturerId: manufacturerId || undefined,
          tobaccoId: tobaccoId || undefined,
          profile: profile || undefined,
        });

        setItems(mixesRes.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [
    authState.tokens,
    authState.user?.id,
    manufacturerId,
    onAuthUpdate,
    ownOnly,
    profile,
    tobaccoId,
  ]);

  const sortedItems = useMemo(() => items, [items]);
  const hasFilters = Boolean(ownOnly || manufacturerId || tobaccoId || profile);

  return (
    <section className="catalog-layout">
      <section className="catalog-controls">
        <div className="filters-row">
          <label className="filter-field">
            <span>Источник</span>
            <select
              value={ownOnly ? 'mine' : 'all'}
              onChange={(event) => setOwnOnly(event.target.value === 'mine')}
            >
              <option value="all">Все миксы</option>
              <option value="mine">Только мои</option>
            </select>
          </label>

          <label className="filter-field">
            <span>Бренд</span>
            <select value={manufacturerId} onChange={(event) => setManufacturerId(event.target.value)}>
              <option value="">Все бренды</option>
              {manufacturers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Табак</span>
            <select value={tobaccoId} onChange={(event) => setTobaccoId(event.target.value)}>
              <option value="">Любой табак</option>
              {tobaccos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Профиль</span>
            <select
              value={profile}
              onChange={(event) => setProfile(event.target.value as '' | FlavorProfile)}
            >
              {PROFILE_OPTIONS.map((item) => (
                <option key={item.value || 'all'} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card catalog-summary">
        <p className="card-title">Миксы</p>
        <p className="card-text">
          {status === 'loading' ? 'Обновляем список...' : `${sortedItems.length} миксов`}
          {hasFilters ? ' · фильтры активны' : ''}
        </p>
      </section>

      {status === 'error' ? <p className="screen-status error">Не удалось загрузить миксы.</p> : null}

      {status !== 'error' && status !== 'loading' && !sortedItems.length ? (
        <p className="screen-status">По выбранным фильтрам миксы не найдены.</p>
      ) : null}

      <section className="list-grid">
        {sortedItems.map((mix) => (
          <article key={mix.id} className="card mix-card">
            <div className="mix-header">
              <h3>{mix.name}</h3>
              <span className="chip">{mix.components.length} комп.</span>
            </div>
            <p className="mix-description">{mix.description?.trim() || 'Описание пока не добавлено.'}</p>
            <div className="mix-components">
              {mix.components.map((component) => (
                <div key={`${mix.id}:${component.tobacco.id}`} className="mix-component-row">
                  <span>
                    {component.tobacco.manufacturer.name} {component.tobacco.name}
                  </span>
                  <b>{component.proportion}%</b>
                </div>
              ))}
            </div>
            <p className="mix-ratings">
              Моя оценка: <b>{ratings[mix.id]?.rating ?? 'нет'}</b>
              {' · '}
              Средняя: <b>{summaries[mix.id]?.avgRating?.toFixed(1) ?? 'нет'}</b>
            </p>
          </article>
        ))}
      </section>
    </section>
  );
};
