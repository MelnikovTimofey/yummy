import { useEffect, useState } from 'react';
import { getHomeRails } from '../shared/apiClient';
import { AuthState, HomeRail } from '../shared/types';

type HomeScreenProps = {
  authState: AuthState;
  onAuthUpdate: (next: AuthState) => void;
};

export const HomeScreen = ({ authState, onAuthUpdate }: HomeScreenProps) => {
  const [rails, setRails] = useState<HomeRail[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      try {
        const response = await getHomeRails(authState.tokens, onAuthUpdate);
        setRails(response.items);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    };

    void load();
  }, [authState.tokens, onAuthUpdate]);

  return (
    <section className="home-layout">
      {status === 'loading' ? <p className="screen-status">Загрузка главной...</p> : null}
      {status === 'error' ? <p className="screen-status error">Не удалось загрузить рейлы.</p> : null}

      {rails.map((rail) => (
        <section key={rail.id} className={`card home-rail ${rail.size === 'hero' ? 'hero' : ''}`}>
          <div className="mix-header">
            <p className="card-title">{rail.type}</p>
            <span className="chip">{rail.items.length}</span>
          </div>
          <h3 className="home-rail-title">{rail.title}</h3>
          <div className="home-rail-row">
            {rail.items.map((mix) => (
              <article key={`${rail.id}:${mix.id}`} className="home-item">
                <p className="home-item-title">{mix.name}</p>
                <p className="home-item-meta">
                  {mix.components
                    .slice(0, 2)
                    .map((component) => component.tobacco.name)
                    .join(' · ')}
                </p>
              </article>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
};
