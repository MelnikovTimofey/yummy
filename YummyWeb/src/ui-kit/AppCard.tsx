import { type HTMLAttributes } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type AppCardProps = HTMLAttributes<HTMLDivElement>;

export const AppCard = ({ className, ...props }: AppCardProps) => {
  return <Card className={cn('border-border/80 bg-card/95', className)} {...props} />;
};
