import { type HTMLAttributes } from 'react';

import { Badge } from '@/components/ui/badge';

type AppBadgeTone = 'default' | 'muted' | 'outline' | 'danger';

type AppBadgeProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AppBadgeTone;
};

const toneToVariant = (tone: AppBadgeTone) => {
  if (tone === 'muted') return 'secondary';
  if (tone === 'outline') return 'outline';
  if (tone === 'danger') return 'destructive';
  return 'default';
};

export const AppBadge = ({ tone = 'default', ...props }: AppBadgeProps) => {
  return <Badge variant={toneToVariant(tone)} {...props} />;
};
