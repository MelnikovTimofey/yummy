import type { HtReviewsTobaccoDetail } from './types';

const normalize = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const unique = (items: string[]) => Array.from(new Set(items));

const formatStrengthSentence = (officialStrength: string | null | undefined, communityStrength: string | null | undefined) => {
  const official = normalize(officialStrength);
  const community = normalize(communityStrength);

  if (official && community) {
    return `Официальная крепость на HTReviews — ${official}, по оценкам сообщества — ${community}.`;
  }

  if (official) {
    return `Официальная крепость на HTReviews — ${official}.`;
  }

  if (community) {
    return `Крепость по оценкам сообщества на HTReviews — ${community}.`;
  }

  return null;
};

export const buildHtReviewsDescription = (
  detail: Pick<HtReviewsTobaccoDetail, 'description' | 'rawTags' | 'officialStrength' | 'communityStrength' | 'status'>,
) => {
  const directDescription = normalize(detail.description);
  if (directDescription) {
    return directDescription;
  }

  const parts: string[] = [];
  const tags = unique((detail.rawTags ?? []).map((item) => item.trim()).filter(Boolean));
  if (tags.length) {
    parts.push(`На HTReviews для этого вкуса отмечены теги: ${tags.slice(0, 6).join(', ')}.`);
  }

  const strengthSentence = formatStrengthSentence(detail.officialStrength, detail.communityStrength);
  if (strengthSentence) {
    parts.push(strengthSentence);
  }

  const status = normalize(detail.status);
  if (status) {
    parts.push(`Статус на HTReviews — ${status}.`);
  }

  return parts.length ? parts.join(' ') : null;
};
