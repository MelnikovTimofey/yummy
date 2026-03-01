import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type AppTextareaProps = ComponentPropsWithoutRef<typeof Textarea>;

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(({ className, ...props }, ref) => {
  return <Textarea ref={ref} className={cn('bg-background/80', className)} {...props} />;
});

AppTextarea.displayName = 'AppTextarea';
