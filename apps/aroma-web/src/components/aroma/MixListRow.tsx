import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ProfileGlyph } from "./ProfileGlyph";
import { SignatureBar } from "./SignatureBar";

type MixListRowProps = {
  profiles: string[];
  name: string;
  // Вторая строка по экрану: вкусы, причина подбора, заметка кабинета.
  sub?: ReactNode;
  // Пометка над названием, например «Собран вами».
  mark?: ReactNode;
  // Справа: оценка гостей или своя оценка.
  aside?: ReactNode;
  // Микс больше не открывается: строка приглушена.
  off?: boolean;
  onClick?: () => void;
};

// Одна строка микса для всех гостевых списков: Подбор, Витрина, Каталог,
// «Для вас», Кабинет. Вид у них больше не расходится.
export function MixListRow({ profiles, name, sub, mark, aside, off = false, onClick }: MixListRowProps) {
  return (
    <button
      type="button"
      className={cn("mix-row", off && "mix-row-off")}
      onClick={off ? undefined : onClick}
      aria-disabled={off ? true : undefined}
    >
      <ProfileGlyph profiles={profiles} size={44} />
      <span className="mix-row-text">
        {mark ? <span className="mix-row-mark">{mark}</span> : null}
        <span className="mix-row-name">{name}</span>
        <SignatureBar profiles={profiles} height={3} />
        {sub ? <span className="mix-row-sub">{sub}</span> : null}
      </span>
      {aside}
    </button>
  );
}
