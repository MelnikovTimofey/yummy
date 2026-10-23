import { Blend, CircleUserRound, Clapperboard, GalleryHorizontalEnd, Search, Sparkles, type LucideIcon } from "lucide-react";

export type BottomNavTab = "recommendations" | "showcase" | "reels" | "catalog" | "mixer" | "cabinet";

const items: Array<{ id: BottomNavTab; label: string; icon: LucideIcon }> = [
  { id: "recommendations", label: "Подбор", icon: Sparkles },
  { id: "reels", label: "Рилсы", icon: Clapperboard },
  { id: "showcase", label: "Витрина", icon: GalleryHorizontalEnd },
  { id: "catalog", label: "Каталог", icon: Search },
  { id: "mixer", label: "Миксер", icon: Blend },
  { id: "cabinet", label: "Кабинет", icon: CircleUserRound },
];

type BottomNavProps = {
  value: BottomNavTab;
  onChange: (id: BottomNavTab) => void;
};

// Нижняя панель гостя (#168, #243, #263, #349 — рилсы вторыми): только значки, название — в aria-label.
// Колонок столько же, сколько пунктов.
export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ id, label, icon: Icon }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            type="button"
            className="bottom-nav-item"
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            onClick={() => onChange(id)}
          >
            <Icon size={24} strokeWidth={isActive ? 2.1 : 1.8} aria-hidden />
          </button>
        );
      })}
    </nav>
  );
}
