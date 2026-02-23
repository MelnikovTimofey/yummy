import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getManufacturers, getTobaccos } from '../shared/apiClient';
import { FlavorProfile, Manufacturer, Tobacco } from '../shared/types';

const PROFILE_OPTIONS: Array<{ value: '' | FlavorProfile; label: string }> = [
  { value: '', label: 'Все профили' },
  { value: 'sweet', label: 'Сладкий' },
  { value: 'sour', label: 'Кислый' },
  { value: 'spicy', label: 'Пряный' },
  { value: 'fresh', label: 'Свежий' },
  { value: 'dessert', label: 'Десертный' },
  { value: 'tobacco', label: 'Табачный' },
];

const PROFILE_LABEL: Record<FlavorProfile, string> = {
  sweet: 'Сладкий',
  sour: 'Кислый',
  spicy: 'Пряный',
  fresh: 'Свежий',
  dessert: 'Десертный',
  tobacco: 'Табачный',
};

export const CatalogScreen = () => {
  const [queryDraft, setQueryDraft] = useState('');
  const [query, setQuery] = useState('');
  const [manufacturerId, setManufacturerId] = useState('');
  const [profile, setProfile] = useState<'' | FlavorProfile>('');

  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [items, setItems] = useState<Tobacco[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    getManufacturers()
      .then((response) => setManufacturers(response.items))
      .catch(() => setManufacturers([]));
  }, []);

  useEffect(() => {
    setStatus('loading');

    getTobaccos({
      search: query || undefined,
      manufacturerId: manufacturerId || undefined,
      profile: profile || undefined,
    })
      .then((response) => {
        setItems(response.items);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
      });
  }, [manufacturerId, profile, query]);

  const onSubmitSearch = (event: FormEvent) => {
    event.preventDefault();
    setQuery(queryDraft.trim());
  };

  const hasFilters = Boolean(query || manufacturerId || profile);
  const totalLabel = useMemo(() => `${items.length} позиций`, [items.length]);
  const quickFilters = ['Рекомендуемые', 'Новые', 'Свежие', 'Десертные', 'Крепкие'];

  return (
    <section className="catalog-layout">
      <section className="catalog-hero">
        <h2>Каталог вкусов</h2>
        <p>Выбирайте табаки как в онлайн-кинотеатре: фильтры сверху, карточки ниже.</p>
      </section>

      <section className="home-categories">
        {quickFilters.map((item) => (
          <button key={item} type="button" className="home-category-chip">
            {item}
          </button>
        ))}
      </section>

      <form className="catalog-controls" onSubmit={onSubmitSearch}>
        <div className="search-row">
          <input
            className="search-input"
            type="search"
            value={queryDraft}
            onChange={(event) => setQueryDraft(event.target.value)}
            placeholder="Поиск по названию"
          />
          <button type="submit" className="search-button">Искать</button>
        </div>

        <div className="filters-row">
          <label className="filter-field">
            <span>Производитель</span>
            <select
              value={manufacturerId}
              onChange={(event) => setManufacturerId(event.target.value)}
            >
              <option value="">Все бренды</option>
              {manufacturers.map((item) => (
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
      </form>

      <section className="card catalog-summary">
        <p className="card-title">Каталог</p>
        <p className="card-text">
          {status === 'loading' ? 'Обновляем список...' : totalLabel}
          {hasFilters ? ' · фильтры активны' : ''}
        </p>
      </section>

      {status === 'error' ? <p className="screen-status error">Не удалось загрузить каталог.</p> : null}

      {status !== 'error' && items.length === 0 ? (
        <p className="screen-status">По вашему запросу ничего не найдено.</p>
      ) : null}

      <section className="list-grid cinema-grid">
        {items.map((item) => (
          <article key={item.id} className="catalog-poster">
            <div className="mix-poster-overlay">
              <div className="mix-header">
                <h3>{item.name}</h3>
                <span className="chip">{item.strength}/10</span>
              </div>
              <p className="mix-description">{item.manufacturer.name}</p>
              <div className="profile-tags">
                {item.flavorProfiles.map((profileName) => (
                  <span key={`${item.id}:${profileName}`} className="profile-tag">
                    {PROFILE_LABEL[profileName]}
                  </span>
                ))}
              </div>
              {item.flavorTags.length ? (
                <p className="hint">Теги: {item.flavorTags.join(', ')}</p>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
};
