import { type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import { Heart, Info } from 'lucide-react';

import { AppBadge, AppButton } from '@/ui-kit';
import { type FlavorProfile, type Mix } from '@/shared/types';

type MixPreviewCardSize = 'rail' | 'grid' | 'fluid';

type MixPreviewCardProps = {
  mix: Mix;
  currentUserId?: string;
  onOpen?: (mix: Mix) => void;
  onOpenInfo?: (mix: Mix) => void;
  onToggleFavorite?: (mix: Mix) => void;
  isFavorite?: boolean;
  favoriteGuest?: boolean;
  favoriteTitle?: string;
  ratingTagText?: string;
  footerText?: string;
  className?: string;
  size?: MixPreviewCardSize;
  style?: CSSProperties;
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

const sanitizeProfiles = (profiles: unknown[]) =>
  dedupe(
    profiles
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter((value): value is FlavorProfile => PROFILE_VALUES.has(value as FlavorProfile)),
  );

const getOrderedProfileTags = (mix: Mix) => {
  const weightedProfiles = new Map<FlavorProfile, number>();
  const firstSeenOrder = new Map<FlavorProfile, number>();
  let seenCounter = 0;

  for (const component of mix.components) {
    const profiles = sanitizeProfiles(component.tobacco.flavorProfiles ?? []);
    if (!profiles.length) {
      continue;
    }

    const profileShare = component.proportion / profiles.length;
    for (const profile of profiles) {
      weightedProfiles.set(profile, (weightedProfiles.get(profile) ?? 0) + profileShare);
      if (!firstSeenOrder.has(profile)) {
        firstSeenOrder.set(profile, seenCounter);
        seenCounter += 1;
      }
    }
  }

  if (weightedProfiles.size) {
    const sortedByProportion = Array.from(weightedProfiles.keys()).sort((left, right) => {
      const diff = (weightedProfiles.get(right) ?? 0) - (weightedProfiles.get(left) ?? 0);
      if (Math.abs(diff) > 0.001) {
        return diff;
      }
      return (firstSeenOrder.get(left) ?? 0) - (firstSeenOrder.get(right) ?? 0);
    });

    const directProfiles = sanitizeProfiles(mix.flavorProfiles ?? []);
    const restFromDirect = directProfiles.filter((profile) => !weightedProfiles.has(profile));
    return [...sortedByProportion, ...restFromDirect];
  }

  return sanitizeProfiles(mix.flavorProfiles ?? []);
};

const getFlavorLabels = (mix: Mix) => {
  const fromMix = dedupe(
    (mix.flavors ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );
  if (fromMix.length) {
    return fromMix;
  }

  return dedupe(
    mix.components.flatMap((component) =>
      (component.tobacco.flavors ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
};

const getFlavorText = (mix: Mix, profileTags: FlavorProfile[]) => {
  const flavorLabels = getFlavorLabels(mix);
  if (flavorLabels.length) {
    return flavorLabels.slice(0, 3).join(' · ');
  }
  if (profileTags.length) {
    return profileTags
      .slice(0, 2)
      .map((tag) => PROFILE_LABELS[tag].toLowerCase())
      .join(' · ');
  }
  return 'вкус не указан';
};

const getMixTone = (mix: Mix) => {
  const palette = ['#a56e3f', '#7a5b46', '#556a5f', '#6e4f45', '#5f5869', '#8f704d'];
  const source = `${mix.name}:${mix.id}`;
  const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
};

export const MixPreviewCard = ({
  mix,
  currentUserId,
  onOpen,
  onOpenInfo,
  onToggleFavorite,
  isFavorite = false,
  favoriteGuest = false,
  favoriteTitle,
  ratingTagText,
  footerText,
  className,
  size = 'grid',
  style,
}: MixPreviewCardProps) => {
  const profileTags = getOrderedProfileTags(mix);
  const dominantProfileTag = profileTags[0] ?? null;
  const flavorText = getFlavorText(mix, profileTags);
  const isClickable = Boolean(onOpen);
  const userMixTag = mix.isUserMix
    ? mix.author?.id && currentUserId && mix.author.id === currentUserId
      ? 'Мой микс'
      : 'Пользовательский'
    : null;

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isClickable) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen?.(mix);
    }
  };

  const onCardClick = () => {
    onOpen?.(mix);
  };

  const onInfoClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onOpenInfo?.(mix);
  };

  const onFavoriteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleFavorite?.(mix);
  };

  return (
    <article
      className={`mix-unified-card mix-unified-card-${size} ${isClickable ? 'interactive' : 'static'} ${className ?? ''}`.trim()}
      onClick={isClickable ? onCardClick : undefined}
      onKeyDown={onKeyDown}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      style={{
        background: `linear-gradient(145deg, ${getMixTone(mix)}b0 0%, #1a1715 74%, #120f0d 100%)`,
        ...style,
      }}
    >
      <div className="mix-unified-overlay">
        <div className="mix-unified-head">
          <div className="mix-unified-title-wrap">
            {userMixTag ? (
              <AppBadge tone="muted" className="mix-user-tag">
                {userMixTag}
              </AppBadge>
            ) : null}
            <p className="mix-unified-title">{mix.name}</p>
          </div>
          <div className="mix-unified-actions">
            {onOpenInfo ? (
              <AppButton
                variant="icon"
                className="mix-action-btn"
                onClick={onInfoClick}
                aria-label="Описание"
              >
                <Info className="mix-action-icon" aria-hidden="true" />
              </AppButton>
            ) : null}
            {onToggleFavorite ? (
              <AppButton
                variant="icon"
                className={`mix-action-btn mix-fav-btn ${isFavorite ? 'active' : ''} ${favoriteGuest ? 'guest' : ''}`}
                onClick={onFavoriteClick}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                title={favoriteTitle}
              >
                <Heart className="mix-action-icon" aria-hidden="true" />
              </AppButton>
            ) : null}
          </div>
        </div>

        <div className="mix-unified-body">
          <p className="mix-unified-meta">{flavorText}</p>
          <div className="mix-unified-tags">
            {ratingTagText ? (
              <AppBadge tone="muted" className="profile-tag mix-rating-tag">
                {ratingTagText}
              </AppBadge>
            ) : null}
            {dominantProfileTag ? (
              <AppBadge key={`${mix.id}:profile:${dominantProfileTag}`} tone="muted" className="profile-tag">
                {PROFILE_LABELS[dominantProfileTag]}
              </AppBadge>
            ) : null}
          </div>
          {footerText ? <p className="mix-ratings mix-unified-footer">{footerText}</p> : null}
        </div>
      </div>
    </article>
  );
};
