import { ProfileGlyph, SignatureBar } from '@/components/aroma';
import { rowMark, rowNote, rowOpens, type GuestCabinetItem } from '@/lib/cabinet';
import { cn } from '@/lib/utils';

// Строка истории и избранного (#244, мокап cab-history / cab-favorites).
// Удалённый или скрытый мастером микс приглушён и не открывается.
export function CabinetRow({ item, onOpen }: { item: GuestCabinetItem; onOpen: () => void }) {
  const opens = rowOpens(item);
  const mark = rowMark(item);
  const note = rowNote(item);

  return (
    <button
      type="button"
      className={cn('cab-row', !opens && 'cab-row-off')}
      onClick={opens ? onOpen : undefined}
      aria-disabled={opens ? undefined : true}
    >
      <ProfileGlyph profiles={item.flavorProfiles} size={44} />
      <span className="cab-row-text">
        {mark ? <span className="aroma-caps cab-mark">{mark}</span> : null}
        <span className="cab-row-name">{item.name}</span>
        <SignatureBar profiles={item.flavorProfiles} height={3} />
        {note ? <span className="cab-row-note">{note}</span> : null}
      </span>
      {item.ownRating ? (
        <span className="cab-own" aria-label={`Ваша оценка ${item.ownRating}`}>
          {`★ ${item.ownRating}`}
        </span>
      ) : null}
    </button>
  );
}
