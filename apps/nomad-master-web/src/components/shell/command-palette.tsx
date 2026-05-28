import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Search, type LucideIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

export type CommandPaletteItem = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string;
  icon?: LucideIcon;
  searchOnly?: boolean;
  onSelect: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyLabel?: string;
};

const normalize = (value: string) => value.toLocaleLowerCase('ru-RU').trim();

export const CommandPalette = ({
  open,
  onOpenChange,
  items,
  placeholder = 'Что нужно сделать? — миксы, табаки, рейлы, действия',
  emptyLabel = 'Ничего не нашёл',
}: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const visibleItems = useMemo(() => {
    const q = normalize(query);
    return items.filter((item) => {
      if (q.length === 0) {
        return !item.searchOnly;
      }
      const hay = `${normalize(item.label)} ${normalize(item.keywords ?? '')} ${normalize(item.group)}`;
      return hay.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(visibleItems.length > 0 ? visibleItems.length - 1 : 0);
    }
  }, [visibleItems.length, activeIndex]);

  const grouped = useMemo(() => {
    const acc = new Map<string, { items: CommandPaletteItem[]; startIndex: number }>();
    visibleItems.forEach((item, idx) => {
      const bucket = acc.get(item.group);
      if (bucket) {
        bucket.items.push(item);
      } else {
        acc.set(item.group, { items: [item], startIndex: idx });
      }
    });
    return Array.from(acc.entries());
  }, [visibleItems]);

  const runItem = (item: CommandPaletteItem) => {
    item.onSelect();
    onOpenChange(false);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, Math.max(0, visibleItems.length - 1)));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const item = visibleItems[activeIndex];
      if (item) runItem(item);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(0, visibleItems.length - 1));
    }
  };

  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>('[data-cmdk-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="cmdk sm:max-w-xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Командная палитра</DialogTitle>

        <div className="cmdk__input flex items-center gap-2 border-b border-border px-3 py-2">
          <Search size={16} aria-hidden="true" className="text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            aria-label="Поиск команды"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          <kbd className="kbd text-[10px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="cmdk__list max-h-[60vh] overflow-y-auto py-1" role="listbox">
          {grouped.map(([groupLabel, bucket]) => (
            <div key={groupLabel} className="cmdk__group">
              <div className="cmdk__group-label px-3 pt-2 pb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {groupLabel}
              </div>
              {bucket.items.map((item, indexInGroup) => {
                const flatIndex = bucket.startIndex + indexInGroup;
                const isActive = flatIndex === activeIndex;
                const Icon: LucideIcon = item.icon ?? Command;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-cmdk-active={isActive}
                    className={
                      isActive
                        ? 'cmdk__item flex w-full items-center gap-2 px-3 py-2 text-sm bg-accent text-accent-foreground'
                        : 'cmdk__item flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent/50'
                    }
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onClick={() => runItem(item)}
                  >
                    <Icon size={14} aria-hidden="true" className="shrink-0" />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.hint ? (
                      <span className="cmdk__item__hint text-xs text-muted-foreground shrink-0">
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}

          {visibleItems.length === 0 ? (
            <div className="cmdk__empty px-6 py-8 text-center text-sm text-muted-foreground">
              <div className="font-medium text-foreground">{emptyLabel}</div>
              <div className="mt-1">Попробуй другой запрос.</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};
