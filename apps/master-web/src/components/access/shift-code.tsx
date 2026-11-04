import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import type { CurrentDailyCode } from '@/contracts';
import type { DailyCodeRotateStatus } from '@/hooks/use-daily-code';
import { BusyLabel, SmokeLoading } from '@/components/ui/loading';
import { describeShiftCode } from './shift-code-lines';
import type { AccessLoadStatus } from './types';

type ShiftCodeProps = {
  currentDailyCode: CurrentDailyCode;
  status: AccessLoadStatus;
  error: string;
  // Без выпуска — компактный вид для листа «Ещё» (#shot=more).
  rotate?: { status: DailyCodeRotateStatus; error: string; onRotate: () => void | Promise<void> };
};

const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
};

// Код смены на телефоне (#337, #shot=access, #shot=more): назвать гостю у стойки.
export const ShiftCode = ({ currentDailyCode, status, error, rotate }: ShiftCodeProps) => {
  const lines = describeShiftCode(currentDailyCode, useNow());
  const [copied, setCopied] = useState(false);
  const rotating = rotate?.status === 'rotating';

  const copy = async () => {
    if (!lines.value) return;
    try {
      await navigator.clipboard?.writeText(lines.value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // код и так на экране
    }
  };

  return (
    <section className="m-code" aria-label="Код смены">
      <div className="m-code__row">
        <span className="m-code__caps">Код смены</span>
        <span className="m-code__status" data-active={lines.active}>
          <i aria-hidden="true" />
          {lines.status}
        </span>
      </div>

      {status === 'loading' && !lines.value ? (
        <SmokeLoading label="Загружаем код смены" />
      ) : (
        <div className="m-code__row">
          <span className="mono m-code__value" data-empty={!lines.value || undefined}>
            {lines.value || 'Нет кода'}
          </span>
          <button type="button" className="btn m-code__copy" onClick={copy} disabled={!lines.value}>
            <Copy size={15} aria-hidden />
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
      )}

      {lines.active ? (
        <>
          <div
            className="m-code__bar"
            role="progressbar"
            aria-label="Срок кода"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(lines.progress)}
          >
            <i data-urgency={lines.urgency} style={{ width: `${lines.progress}%` }} />
          </div>
          <div className="m-code__line">
            <span>{lines.until}</span>
            <span>{lines.left}</span>
          </div>
        </>
      ) : lines.until ? (
        <p className="m-code__line">{lines.until}</p>
      ) : null}

      {error ? <p className="error-text m-code__error">{error}</p> : null}
      {rotate?.error ? <p className="error-text m-code__error">{rotate.error}</p> : null}

      {rotate ? (
        <button
          type="button"
          className="btn m-code__rotate"
          data-variant="ghost"
          onClick={() => void rotate.onRotate()}
          disabled={rotating}
          aria-busy={rotating || undefined}
        >
          <BusyLabel busy={rotating}>Выпустить новый код</BusyLabel>
        </button>
      ) : null}
    </section>
  );
};
