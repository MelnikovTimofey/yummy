import type { ReactNode } from 'react';
import { EllipsisVertical, Share, SquarePlus, X } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { InstallWay } from '@/lib/install-hint';

export type InstallSheetWay = Exclude<InstallWay, 'prompt'>;

// Знак «Дым» на угле, как иконка на экране телефона (#586). Размер задаёт место.
function AppIcon() {
  return (
    <span className="app-icon" aria-hidden>
      <img src="/logo-mark-oxblood.svg" alt="" />
    </span>
  );
}

// Плашка один раз после первого «Покурить» (#587, мокап plate). Вне <nav>, над панелью.
export function InstallPlate({ onAdd, onHide }: { onAdd: () => void; onHide: () => void }) {
  return (
    <div className="install-plate" role="region" aria-label="На экран «Домой»">
      <AppIcon />
      <p className="install-plate-text">Держите Арома Ателье на экране телефона.</p>
      <button type="button" className="install-plate-add" onClick={onAdd}>
        Добавить
      </button>
      <button type="button" className="install-plate-x" aria-label="Скрыть подсказку" onClick={onHide}>
        <X size={18} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  );
}

// Тихая ссылка в «Кабинете», как «Изменить вкусы» (мокапы cab-anon, cab-in).
export function InstallLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="install-link" onClick={onClick}>
      На экран «Домой»
    </button>
  );
}

const Glyph = ({ children }: { children: ReactNode }) => (
  <span className="install-glyph" aria-hidden>
    {children}
  </span>
);

const Step = ({ n, children }: { n: number; children: ReactNode }) => (
  <li>
    <span className="install-step-n" aria-hidden>
      {n}
    </span>
    <span>{children}</span>
  </li>
);

const glyphSize = { size: 17, strokeWidth: 1.8 };

// Шаги для браузера гостя (мокапы sheet-ios, sheet-android, sheet-inapp).
export function InstallSheet({ open, way, onClose }: { open: boolean; way: InstallSheetWay; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet install-sheet"
        // У шагов нет абзаца-описания: явный undefined снимает предупреждение Radix.
        {...(way === 'inapp' ? {} : { 'aria-describedby': undefined })}
        style={{
          top: 'auto',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(calc(100vw - 16px), 540px)',
          padding: '12px 20px calc(20px + env(safe-area-inset-bottom))',
          borderTopLeftRadius: 'var(--r-guest-sheet)',
          borderTopRightRadius: 'var(--r-guest-sheet)',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          background: 'var(--guest-sheet-bg)',
        }}
      >
        <span className="aroma-mix-sheet-handle" aria-hidden />
        <div className="install-sheet-head">
          <AppIcon />
          <DialogTitle className="aroma-mix-sheet-title">На экран «Домой»</DialogTitle>
        </div>
        {way === 'inapp' ? (
          <DialogDescription className="aroma-mix-sheet-desc">
            Добавить можно только из Safari. Откройте эту страницу в Safari и нажмите <b>Поделиться</b>.
          </DialogDescription>
        ) : (
          <ol className="install-steps">
            {way === 'ios' ? (
              <>
                <Step n={1}>
                  Нажмите{' '}
                  <Glyph>
                    <Share {...glyphSize} />
                  </Glyph>{' '}
                  <b>Поделиться</b> внизу экрана. Если её не видно, сначала <b>•••</b>.
                </Step>
                <Step n={2}>
                  Выберите{' '}
                  <Glyph>
                    <SquarePlus {...glyphSize} />
                  </Glyph>{' '}
                  <b>На экран «Домой»</b>.
                </Step>
              </>
            ) : (
              <>
                <Step n={1}>
                  Откройте меню браузера{' '}
                  <Glyph>
                    <EllipsisVertical {...glyphSize} />
                  </Glyph>
                  .
                </Step>
                <Step n={2}>
                  Выберите <b>Добавить на главный экран</b>.
                </Step>
              </>
            )}
          </ol>
        )}
        <button type="button" className="aroma-mix-sheet-ghost" onClick={onClose}>
          Понятно
        </button>
      </DialogContent>
    </Dialog>
  );
}
