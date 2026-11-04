import type { CurrentDailyCode } from '@/contracts';
import { computeCountdownState, computeProgressPercent, type CountdownUrgency } from '@/hooks/use-countdown';
import { formatCodeDeadline } from './format-date-time';

export type ShiftCodeLines = {
  status: string;
  active: boolean;
  value: string;
  until: string;
  left: string;
  progress: number;
  urgency: CountdownUrgency;
};

// Строки кода смены на телефоне (#337, #shot=access): «Доступ» и лист «Ещё».
export const describeShiftCode = (current: CurrentDailyCode, nowMs: number): ShiftCodeLines => {
  if (current.state === 'active') {
    const { code } = current;
    const countdown = computeCountdownState(code.endsAt, nowMs);
    return {
      status: 'действует',
      active: true,
      value: code.codeValue,
      until: `до ${formatCodeDeadline(code.endsAt)}`,
      left: countdown.expired ? 'истёк' : `осталось ${countdown.remaining}`,
      progress: computeProgressPercent(code.startsAt, code.endsAt, nowMs),
      urgency: countdown.urgency,
    };
  }

  if (current.state === 'expired') {
    return {
      status: 'истёк',
      active: false,
      value: '',
      until: `код ${current.code.codeValue} действовал до ${formatCodeDeadline(current.code.endsAt)}`,
      left: '',
      progress: 100,
      urgency: 'expired',
    };
  }

  return { status: 'нет кода', active: false, value: '', until: '', left: '', progress: 0, urgency: 'fresh' };
};
