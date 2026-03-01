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
};

export const AppTabs = ({ value, onChange, items, className }: AppTabsProps) => {
  return (
    <Tabs value={value} onValueChange={onChange} className={className}>
      <TabsList className="w-full justify-start overflow-auto rounded-full bg-secondary/70 p-1">
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
