import { Blend, GalleryHorizontalEnd, Search, Sparkles, type LucideIcon } from "lucide-react";

export type BottomNavTab = "recommendations" | "showcase" | "catalog" | "mixer";

const items: Array<{ id: BottomNavTab; label: string; icon: LucideIcon }> = [
  { id: "recommendations", label: "Подбор", icon: Sparkles },
  { id: "showcase", label: "Витрина", icon: GalleryHorizontalEnd },
  { id: "catalog", label: "Каталог", icon: Search },
  { id: "mixer", label: "Миксер", icon: Blend },
];

type BottomNavProps = {
  value: BottomNavTab;
  onChange: (id: BottomNavTab) => void;
};

// Нижняя панель гостя (#168): только значки, название — в aria-label.
export function BottomNav({ value, onChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Гостевая навигация">
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
