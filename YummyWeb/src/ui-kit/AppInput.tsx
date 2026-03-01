import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AppInputProps = ComponentPropsWithoutRef<typeof Input>;

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({ className, ...props }, ref) => {
  return <Input ref={ref} className={cn('bg-background/80', className)} {...props} />;
});

AppInput.displayName = 'AppInput';
