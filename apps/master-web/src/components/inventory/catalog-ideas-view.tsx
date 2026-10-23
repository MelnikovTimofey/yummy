import { Eye, Star } from 'lucide-react';
import { HtreviewsLink } from '@/components/ui/htreviews-link';
import { ProfileTag } from '@/components/ui/profile-tag';
import type { CatalogIdea } from '@/contracts';
import type { CatalogIdeasApi } from '@/hooks/use-catalog-ideas';
import { formatHtRating, formatRatingsCount, formatViews, ideaSections } from '@/lib/catalog-ideas';

type CatalogIdeasViewProps = {
  ideas: CatalogIdeasApi;
  shelfStatuses: ReadonlyMap<string, 'active' | 'plan'>;
};

const IdeaCard = ({ idea, planned, onPlan }: { idea: CatalogIdea; planned: boolean; onPlan: () => void }) => (
  <article className="catalog-idea" data-tobacco-id={idea.id} aria-label={`${idea.manufacturer} ${idea.name}`}>
    <span className="catalog-idea__brand">{idea.manufacturer}</span>
    <h3 className="catalog-idea__name">{idea.name}</h3>
    {idea.flavorProfiles.length ? (
      <div className="catalog-idea__tags">
        {idea.flavorProfiles.map((profile) => (
          <ProfileTag key={profile} profile={profile} />
        ))}
      </div>
    ) : null}
    <div className="catalog-idea__stats">
      <span title="Рейтинг htreviews">
        <Star size={13} aria-hidden />
        <span className="sr-only">Рейтинг htreviews</span>
        {formatHtRating(idea.rating)}
      </span>
      <span>{formatRatingsCount(idea.ratingsCount)}</span>
      <span title="Просмотров на htreviews">
        <Eye size={13} aria-hidden />
        {formatViews(idea.viewsCount)}
        <span className="sr-only"> просмотров</span>
      </span>
    </div>
    {idea.why ? <p className="catalog-idea__why">{idea.why}</p> : null}
    <div className="catalog-idea__actions">
      {idea.sourceUrl ? <HtreviewsLink href={idea.sourceUrl} /> : <span />}
      {planned ? (
        <span className="tag" data-tone="info">в плане</span>
      ) : (
        <button type="button" className="btn" data-size="sm" aria-label={`В план: ${idea.name}`} onClick={onPlan}>
          В план
        </button>
      )}
    </div>
  </article>
);

export const CatalogIdeasView = ({ ideas, shelfStatuses }: CatalogIdeasViewProps) => {
  if (ideas.status === 'error') {
    return (
      <div className="catalog-ideas">
        <p className="error-text">{ideas.error}</p>
        <button type="button" className="btn" data-size="sm" onClick={() => void ideas.reload()}>
          Повторить
        </button>
      </div>
    );
  }

  if (!ideas.ideas) {
    return <p className="meta-line">Загружаем идеи для закупки…</p>;
  }

  const sections = ideaSections(ideas.ideas, shelfStatuses);

  if (!sections.length) {
    return (
      <p className="catalog-ideas__empty">
        Идей пока нет. Статистика htreviews появится после следующей синхронизации каталога.
      </p>
    );
  }

  return (
    <div className="catalog-ideas">
      {ideas.planError ? <p className="error-text">{ideas.planError}</p> : null}
      {sections.map((section) => (
        <section key={section.key} className="catalog-ideas__section" aria-labelledby={`ideas-${section.key}`}>
          <div className="catalog-ideas__head">
            <h2 id={`ideas-${section.key}`}>{section.title}</h2>
            {section.hint ? <p>{section.hint}</p> : null}
          </div>
          <div className="catalog-ideas__grid">
            {section.items.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                planned={ideas.planned.has(idea.id) || shelfStatuses.get(idea.id) === 'plan'}
                onPlan={() => void ideas.plan(idea)}
              />
            ))}
          </div>
        </section>
      ))}
      <p className="catalog-ideas__hint">
        Табаков с полки здесь нет. Данные htreviews на дату последней синхронизации.
      </p>
    </div>
  );
};
