import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type TabItem = {
  value: string;
  label: string;
};

type AppTabsProps = {
  value: string;
  onChange: (value: string) => void;
  items: TabItem[];
  className?: string;
  listClassName?: string;
  stretch?: boolean;
};

export const AppTabs = ({
  value,
  onChange,
  items,
  className,
  listClassName,
  stretch = true,
}: AppTabsProps) => {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList
        className={cn(
          stretch ? 'w-full' : 'w-auto',
          'justify-start overflow-auto rounded-full bg-secondary/70 p-1',
          listClassName,
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className={cn(
              'rounded-full px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground',
            )}
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
