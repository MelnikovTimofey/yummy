import { Chip } from '@/components/aroma';
import { pluralize } from '@/lib/mixer/copy';
import { getProfileColor } from '@/lib/profile-color';
import { profileLabelMap } from '@/lib/profile-labels';

// Полки — flavorProfiles табаков текущей колоды, мультивыбор, «Все» снимает фильтр.
export function ShelfFilter({
  shelves,
  selected,
  count,
  fromOnboarding,
  onToggle,
  onAll,
}: {
  shelves: string[];
  selected: string[];
  count: number;
  fromOnboarding: boolean;
  onToggle: (shelf: string) => void;
  onAll: () => void;
}) {
  return (
    <div className="mixer-filters">
      <div className="mixer-filters-head">
        <span className="aroma-caps">Полки</span>
        <span className="mixer-filters-count" aria-live="polite">
          {fromOnboarding ? 'из вашего подбора · ' : ''}
          {`${count} ${pluralize(count, ['табак', 'табака', 'табаков'])} в колоде · по кругу`}
        </span>
      </div>
      <div className="mixer-shelves" role="group" aria-label="Полки, можно несколько">
        <Chip active={!selected.length} onClick={onAll}>
          Все
        </Chip>
        {shelves.map((shelf) => (
          <Chip
            key={shelf}
            color={getProfileColor(shelf)}
            active={selected.includes(shelf)}
            onClick={() => onToggle(shelf)}
          >
            {profileLabelMap[shelf] ?? shelf}
          </Chip>
        ))}
      </div>
    </div>
  );
}
