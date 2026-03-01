import { type ButtonHTMLAttributes } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AppButtonVariant = 'primary' | 'ghost' | 'danger' | 'chip' | 'tab' | 'icon' | 'outline';
type AppButtonSize = 'sm' | 'md' | 'lg';

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  active?: boolean;
};

const mapButtonVariant = (variant: AppButtonVariant) => {
  if (variant === 'primary') return 'default';
  if (variant === 'danger') return 'destructive';
  if (variant === 'outline') return 'outline';
  if (variant === 'ghost' || variant === 'tab' || variant === 'icon') return 'ghost';
  return 'secondary';
};

const mapButtonSize = (variant: AppButtonVariant, size: AppButtonSize) => {
  if (variant === 'icon') return 'icon';
  if (size === 'sm') return 'sm';
  if (size === 'lg') return 'lg';
  return 'default';
};

export const AppButton = ({
  variant = 'primary',
  size = 'md',
  active = false,
  className,
  type = 'button',
  ...props
}: AppButtonProps) => {
  return (
    <Button
      type={type}
      variant={mapButtonVariant(variant)}
      size={mapButtonSize(variant, size)}
      className={cn(
        variant === 'chip' && 'h-8 rounded-full px-3 text-xs',
        variant === 'tab' && 'rounded-full px-4',
        variant === 'tab' && active && 'bg-secondary text-secondary-foreground',
        className,
      )}
      {...props}
    />
  );
};
