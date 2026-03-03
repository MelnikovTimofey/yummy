import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type AppSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  triggerTestId?: string;
};

const EMPTY_VALUE = '__app_select_empty__';

export const AppSelect = ({
  value,
  onChange,
  options,
  placeholder,
  emptyLabel,
  disabled,
  className,
  triggerClassName,
  contentClassName,
  triggerTestId,
}: AppSelectProps) => {
  const normalizedValue = value === '' ? EMPTY_VALUE : value;

  return (
    <div className={className}>
      <Select
        value={normalizedValue}
        disabled={disabled}
        onValueChange={(next) => onChange(next === EMPTY_VALUE ? '' : next)}
      >
        <SelectTrigger
          className={cn('bg-background/80', triggerClassName)}
          data-testid={triggerTestId}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className={contentClassName}>
          {emptyLabel ? <SelectItem value={EMPTY_VALUE}>{emptyLabel}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
