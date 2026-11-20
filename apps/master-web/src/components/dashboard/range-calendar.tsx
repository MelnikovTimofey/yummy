import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  MONTH_TITLES,
  WEEKDAYS,
  calendarRightMonth,
  monthGrid,
  pickRangeDay,
  rangeCaption,
  shiftMonth,
  type DayRange,
  type MonthRef,
} from '@/lib/guest-choices';

type RangeCalendarProps = {
  initial: DayRange | null;
  // Конец периода — не позже сегодня.
  today: string;
  // Два месяца на десктопе, один на телефоне.
  months: 1 | 2;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
};

const monthIndex = ({ year, month }: MonthRef) => year * 12 + month;

// «Даты» (#shot=calendar): своего календаря в проекте нет, этот на тех же токенах,
// как shadcn Calendar mode="range". Первый клик начинает диапазон, второй закрывает.
export function RangeCalendar({ initial, today, months, onApply, onClose }: RangeCalendarProps) {
  const [range, setRange] = useState<DayRange | null>(initial);
  const [right, setRight] = useState<MonthRef>(() => calendarRightMonth(initial, today, months));
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      // Кнопка «Даты» сама открывает и закрывает календарь.
      if (rootRef.current?.contains(target) || target?.closest('[data-calendar-toggle]')) return;
      closeRef.current();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const shown = months === 2 ? [shiftMonth(right, -1), right] : [right];
  const latest = calendarRightMonth(null, today, months);
  const end = range ? (range.to ?? range.from) : null;

  const cellState = (key: string) => {
    if (!range) return undefined;
    if (key === range.from || key === end) return 'edge';
    if (end && key > range.from && key < end) return 'in';
    return undefined;
  };

  return (
    <div className="dash-calendar" role="dialog" aria-label="Период" ref={rootRef}>
      <div className="dash-calendar__months" data-months={months}>
        {shown.map((month, index) => (
          <div className="dash-calendar__month" key={monthIndex(month)}>
            <div className="dash-calendar__title">
              {index === 0 ? (
                <button type="button" className="icon-btn" aria-label="Предыдущий месяц" onClick={() => setRight(shiftMonth(right, -1))}>
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
              <h3>
                {MONTH_TITLES[month.month]} {month.year}
              </h3>
              {index === shown.length - 1 ? (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Следующий месяц"
                  disabled={monthIndex(right) >= monthIndex(latest)}
                  onClick={() => setRight(shiftMonth(right, 1))}
                >
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              ) : (
                <span />
              )}
            </div>
            <div className="dash-calendar__grid">
              {WEEKDAYS.map((weekday) => (
                <span key={weekday} className="dash-calendar__weekday">
                  {weekday}
                </span>
              ))}
              {monthGrid(month.year, month.month).map((cell) =>
                cell.outside ? (
                  <span key={cell.key} className="dash-calendar__day" data-outside="true">
                    {cell.day}
                  </span>
                ) : (
                  <button
                    type="button"
                    key={cell.key}
                    className="dash-calendar__day"
                    data-state={cellState(cell.key)}
                    aria-pressed={cellState(cell.key) === 'edge'}
                    disabled={cell.key > today}
                    onClick={() => setRange(pickRangeDay(range, cell.key))}
                  >
                    {cell.day}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="dash-calendar__foot">
        <span>{range && end ? rangeCaption(range.from, end) : null}</span>
        <button
          type="button"
          className="btn"
          data-variant="primary"
          data-size="sm"
          disabled={!range}
          onClick={() => range && end && onApply(range.from, end)}
        >
          Показать
        </button>
      </div>
    </div>
  );
}
