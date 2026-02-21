import { useMemo, useState } from 'react';
import { API_BASE_URL } from '../shared/api';

type TabKey = 'mixes' | 'sessions' | 'catalog' | 'recommendations' | 'profile';

type Tab = {
  key: TabKey;
  label: string;
  title: string;
  subtitle: string;
};

const TABS: Tab[] = [
  {
    key: 'mixes',
    label: 'Миксы',
    title: 'Миксы',
    subtitle: 'Создавайте и переиспользуйте удачные сочетания.',
  },
  {
    key: 'sessions',
    label: 'Сессии',
    title: 'Сессии курения',
    subtitle: 'Добавляйте сессии и сохраняйте контекст: где и когда.',
  },
  {
    key: 'catalog',
    label: 'Каталог',
    title: 'Каталог табаков',
    subtitle: 'Фильтры и поиск по брендам, профилям и крепости.',
  },
  {
    key: 'recommendations',
    label: 'Рекомендации',
    title: 'Рекомендации',
    subtitle: 'Подборка миксов на основе ваших оценок и истории.',
  },
  {
    key: 'profile',
    label: 'Профиль',
    title: 'Профиль',
    subtitle: 'Настройка предпочтений и любимых производителей.',
  },
];

export const App = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('mixes');
  const tab = useMemo(() => TABS.find((item) => item.key === activeTab) ?? TABS[0], [activeTab]);

  return (
    <div className="app-bg">
      <div className="phone-shell">
        <header className="topbar">
          <p className="eyebrow">Yummy MVP · mobile web</p>
          <h1>{tab.title}</h1>
          <p className="subtitle">{tab.subtitle}</p>
        </header>

        <main className="content">
          <section className="card">
            <p className="card-title">Текущий экран</p>
            <p className="card-text">
              Каркас готов. Следующим PR подключим API и реальные данные для раздела
              {' '}
              <b>{tab.label}</b>
              .
            </p>
          </section>

          <section className="card">
            <p className="card-title">API endpoint</p>
            <code className="code">{API_BASE_URL}</code>
            <p className="hint">
              Можно переопределить через переменную окружения
              {' '}
              <code>VITE_API_BASE_URL</code>
              .
            </p>
          </section>
        </main>

        <nav className="tabbar" aria-label="Основная навигация">
          {TABS.map((item) => {
            const isActive = item.key === activeTab;
            return (
              <button
                key={item.key}
                type="button"
                className={`tab ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
