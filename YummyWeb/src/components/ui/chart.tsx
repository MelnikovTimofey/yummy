import * as React from 'react';
import * as RechartsPrimitive from 'recharts';

import { cn } from '@/lib/utils';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    color?: string;
  };
};

type ChartContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
};

export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ className, config, children, ...props }, ref) => {
    const style = React.useMemo(() => {
      const vars: React.CSSProperties = {};
      Object.entries(config).forEach(([key, value]) => {
        if (value.color) {
          vars[`--color-${key}` as keyof React.CSSProperties] = value.color;
        }
      });
      return vars;
    }, [config]);

    return (
      <div ref={ref} className={cn('chart-container', className)} style={style} {...props}>
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    );
  },
);

ChartContainer.displayName = 'ChartContainer';
