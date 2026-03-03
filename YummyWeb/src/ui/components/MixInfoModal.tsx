import { type ReactNode, useMemo } from 'react';

import { AppButton, AppModal } from '@/ui-kit';
import { type FlavorProfile, type Mix, type MixRatingSummary } from '@/shared/types';

type MixInfoModalProps = {
  mix: Mix | null;
  summary?: MixRatingSummary;
  onOpenChange: (open: boolean) => void;
  action?: ReactNode;
};

const PROFILE_LABELS: Record<FlavorProfile, string> = {
  sweet: 'Сладкий',
  sour: 'Кислый',
  spicy: 'Пряный',
  fresh: 'Свежий',
  dessert: 'Десертный',
  tobacco: 'Табачный',
  minty: 'Мятный',
  fruity: 'Фруктовый',
  floral_herbal: 'Цветочно-травяной',
  citrus: 'Цитрусовый',
  berry: 'Ягодный',
  perfume: 'Парфюм',
};

const PROFILE_VALUES = new Set<FlavorProfile>(Object.keys(PROFILE_LABELS) as FlavorProfile[]);
const dedupe = <T,>(items: T[]) => Array.from(new Set(items));
const formatPercent = (value: number) => `${Number(value.toFixed(1)).toString().replace('.', ',')}%`;

const sanitizeProfiles = (profiles: unknown[]) =>
  dedupe(
    profiles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile)),
  );

const sanitizeFlavors = (flavors: unknown[]) =>
  dedupe(
    flavors
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );

const buildWeightedRows = <TKey extends string>(
  mix: Mix,
  extractor: (component: Mix['components'][number]) => TKey[],
): Array<{ key: TKey; percent: number }> => {
  const weighted = new Map<TKey, number>();
  for (const component of mix.components) {
    const keys = dedupe(extractor(component));
    if (!keys.length) {
      continue;
    }
    const share = component.proportion / keys.length;
    for (const key of keys) {
      weighted.set(key, (weighted.get(key) ?? 0) + share);
    }
  }
  return Array.from(weighted.entries())
    .map(([key, percent]) => ({ key, percent }))
    .sort((left, right) => right.percent - left.percent);
};

export const MixInfoModal = ({ mix, summary, onOpenChange, action }: MixInfoModalProps) => {
  const details = useMemo(() => {
    if (!mix) {
      return null;
    }

    const tobaccoRows = mix.components
      .map((component) => ({
        label: `${component.tobacco.manufacturer.name} ${component.tobacco.name}`,
        percent: component.proportion,
      }))
      .sort((left, right) => right.percent - left.percent);

    const flavorRows = buildWeightedRows(mix, (component) => sanitizeFlavors(component.tobacco.flavors ?? []));
    const fallbackFlavors = flavorRows.length
      ? flavorRows
      : sanitizeFlavors(mix.flavors ?? []).map((flavor) => ({
          key: flavor,
          percent: 100 / Math.max(1, sanitizeFlavors(mix.flavors ?? []).length),
        }));

    const profileRows = buildWeightedRows(mix, (component) => sanitizeProfiles(component.tobacco.flavorProfiles ?? []));
    const fallbackProfiles = profileRows.length
      ? profileRows
      : sanitizeProfiles(mix.flavorProfiles ?? []).map((profile) => ({
          key: profile,
          percent: 100 / Math.max(1, sanitizeProfiles(mix.flavorProfiles ?? []).length),
        }));

    return {
      description: mix.description?.trim() ?? '',
      tobaccoRows,
      flavorRows: fallbackFlavors,
      profileRows: fallbackProfiles,
      ratingAverage:
        summary?.avgRating === null || summary?.avgRating === undefined
          ? '—'
          : summary.avgRating.toFixed(1).replace('.', ','),
      ratingCount: summary ? String(summary.count) : '—',
    };
  }, [mix, summary]);

  return (
    <AppModal
      open={Boolean(mix)}
      onOpenChange={onOpenChange}
      title="Состав микса"
      contentClassName="mix-info-modal-shell"
      contentTestId="mix-info-modal"
    >
      {mix && details ? (
        <div className="mix-info-modal">
          <h3 className="mix-info-name">{mix.name}</h3>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Оценка</p>
            <ul className="mix-info-list">
              <li className="mix-info-row">
                <span className="mix-info-label">Средняя</span>
                <span className="mix-info-value">{details.ratingAverage}</span>
              </li>
              <li className="mix-info-row">
                <span className="mix-info-label">Количество оценок</span>
                <span className="mix-info-value">{details.ratingCount}</span>
              </li>
            </ul>
          </section>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Табаки и пропорции</p>
            <ul className="mix-info-list">
              {details.tobaccoRows.map((item) => (
                <li key={`${mix.id}:tobacco:${item.label}`} className="mix-info-row">
                  <span className="mix-info-label">{item.label}</span>
                  <span className="mix-info-value">{formatPercent(item.percent)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Вкусы и пропорции</p>
            {details.flavorRows.length ? (
              <ul className="mix-info-list">
                {details.flavorRows.map((item) => (
                  <li key={`${mix.id}:flavor:${item.key}`} className="mix-info-row">
                    <span className="mix-info-label">{item.key}</span>
                    <span className="mix-info-value">{formatPercent(item.percent)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mix-info-empty">Нет данных по вкусам.</p>
            )}
          </section>

          <section className="mix-info-section">
            <p className="mix-info-section-title">Вкусовые профили</p>
            {details.profileRows.length ? (
              <ul className="mix-info-list">
                {details.profileRows.map((item) => (
                  <li key={`${mix.id}:profile:${item.key}`} className="mix-info-row">
                    <span className="mix-info-label">{PROFILE_LABELS[item.key]}</span>
                    <span className="mix-info-value">{formatPercent(item.percent)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mix-info-empty">Профили не указаны.</p>
            )}
          </section>

          {details.description ? (
            <section className="mix-info-section">
              <p className="mix-info-section-title">Описание</p>
              <p className="mix-info-description">{details.description}</p>
            </section>
          ) : null}

          {action}
          <AppButton
            variant="ghost"
            className="ghost-button mix-info-close-btn"
            onClick={() => onOpenChange(false)}
            data-testid="mix-info-close"
          >
            Закрыть
          </AppButton>
        </div>
      ) : null}
    </AppModal>
  );
};
