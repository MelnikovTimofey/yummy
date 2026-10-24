import { MixListRow } from '@/components/aroma';
import { rowMark, rowNote, rowOpens, type GuestCabinetItem } from '@/lib/cabinet';

// Строка истории и избранного (#244, мокап cab-history / cab-favorites).
// Удалённый или скрытый мастером микс приглушён и не открывается.
export function CabinetRow({ item, onOpen }: { item: GuestCabinetItem; onOpen: () => void }) {
  return (
    <MixListRow
      profiles={item.flavorProfiles}
      name={item.name}
      mark={rowMark(item)}
      sub={rowNote(item)}
      aside={
        item.ownRating ? (
          <span className="cab-own" aria-label={`Ваша оценка ${item.ownRating}`}>
            {`★ ${item.ownRating}`}
          </span>
        ) : null
      }
      off={!rowOpens(item)}
      onClick={onOpen}
    />
  );
}
