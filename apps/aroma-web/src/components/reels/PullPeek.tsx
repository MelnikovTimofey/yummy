import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReelStill, type ReelMix } from './ReelStill';
import { PULL_THRESHOLD } from './usePullPast';

// Что открывается за краем при дотягивании (#349): снизу Подбора — статичная
// сцена первого рилса, сверху ленты — пустой фон. Кольцо показывает ход до
// порога и заливается на пороге; подписей нет.
export function PullPeek({ edge, travel, mix }: { edge: 'top' | 'bottom'; travel: number; mix: ReelMix | null }) {
  if (!travel) return null;
  const progress = Math.min(1, travel / PULL_THRESHOLD);
  const Chevron = edge === 'bottom' ? ChevronUp : ChevronDown;
  return (
    <div className={`pull-peek pull-peek-${edge}`} style={{ height: travel / 2 }} aria-hidden>
      {mix ? <ReelStill mix={mix} /> : null}
      <span className={cn('pull-ring', progress >= 1 && 'pull-ring-ready')}>
        {progress < 1 ? (
          <svg className="pull-ring-progress" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="19" pathLength={1} strokeDasharray={`${progress} 1`} />
          </svg>
        ) : null}
        <Chevron size={18} strokeWidth={1.8} />
      </span>
    </div>
  );
}
