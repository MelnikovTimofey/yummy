import { useMemo, useState } from 'react';
import { HomeRail } from '../shared/types';
import { AppInput } from '@/ui-kit';
import { MixInfoModal } from '@/ui/components/MixInfoModal';
import { MixPreviewCard } from '@/ui/components/MixPreviewCard';

type RailScreenProps = {
  rail: HomeRail | null;
  onOpenMix: (mixId: string) => void;
};

export const RailScreen = ({ rail, onOpenMix }: RailScreenProps) => {
  const [search, setSearch] = useState('');
  const [infoMixId, setInfoMixId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!rail) {
      return [];
    }

    const query = search.trim().toLowerCase();
    if (!query) {
      return rail.items;
    }

    return rail.items.filter((mix) => {
      const source = [
        mix.name,
        mix.description ?? '',
        ...(mix.tags ?? []),
        ...mix.components.map((component) => component.tobacco.name),
      ]
        .join(' ')
        .toLowerCase();
      return source.includes(query);
    });
  }, [rail, search]);
  const infoMix = useMemo(
    () => filteredItems.find((item) => item.id === infoMixId) ?? null,
    [filteredItems, infoMixId],
  );

  return (
    <section className="catalog-layout">
      {!rail ? <p className="screen-status">Рейл не выбран.</p> : null}

      {rail ? (
        <>
          <section className="catalog-controls cinema-controls">
            <div className="search-row">
              <AppInput
                className="search-input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Поиск по названию, описанию и табакам"
              />
            </div>
          </section>

          <section className="card catalog-summary">
            <p className="card-title">Результат</p>
            <p className="card-text">{filteredItems.length} миксов</p>
          </section>

          {!filteredItems.length ? <p className="screen-status">По этому рейлу ничего не найдено.</p> : null}

          <section className="list-grid cinema-grid">
            {filteredItems.map((mix) => (
              <MixPreviewCard
                key={`${rail.id}:${mix.id}`}
                mix={mix}
                size="grid"
                onOpen={(currentMix) => onOpenMix(currentMix.id)}
                onOpenInfo={(currentMix) => setInfoMixId(currentMix.id)}
                footerText={mix.components
                  .slice(0, 3)
                  .map((component) => component.tobacco.name)
                  .join(' · ')}
              />
            ))}
          </section>
          <MixInfoModal
            mix={infoMix}
            onOpenChange={(open) => {
              if (!open) {
                setInfoMixId(null);
              }
            }}
          />
        </>
      ) : null}
    </section>
  );
};
