import { useRef, useState } from 'react';
import type { ShelfTrialVerdict } from '@/contracts';
import { nextTrialVerdict } from '@/lib/purchase';

type TrialMarkProps = {
  value: ShelfTrialVerdict | null;
  // Ошибку показывает вызывающий; промис не отклоняется.
  onChange: (next: ShelfTrialVerdict | null) => Promise<unknown>;
  label: string;
  size?: 'md' | 'lg';
};

// «Зашло / Не зашло» (#329, #shot=card-trial, purchase-trials, mobile-trial): отметка
// видна сразу, запрос — следом; не сохранилось — возвращается то, что пришло с сервера.
// Повторный клик по выбранному снимает отметку.
export const TrialMark = ({ value, onChange, label, size = 'md' }: TrialMarkProps) => {
  const [optimistic, setOptimistic] = useState<{ value: ShelfTrialVerdict | null } | null>(null);
  const seq = useRef(0);
  const shown = optimistic ? optimistic.value : value;

  const pick = async (clicked: ShelfTrialVerdict) => {
    const next = nextTrialVerdict(shown, clicked);
    seq.current += 1;
    const mine = seq.current;
    setOptimistic({ value: next });
    await onChange(next);
    if (seq.current === mine) setOptimistic(null);
  };

  return (
    <span className="trial-mark" data-size={size} role="group" aria-label={label} onClick={(event) => event.stopPropagation()}>
      <button type="button" data-verdict="yes" aria-pressed={shown === 'yes'} onClick={() => void pick('yes')}>
        Зашло
      </button>
      <button type="button" data-verdict="no" aria-pressed={shown === 'no'} onClick={() => void pick('no')}>
        Не зашло
      </button>
    </span>
  );
};
