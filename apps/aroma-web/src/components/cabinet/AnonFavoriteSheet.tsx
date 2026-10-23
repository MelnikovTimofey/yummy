import { CTA } from '@/components/aroma';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

// Сердечко у анонима (#244, мокап sheet-anon): не прячем, а предлагаем войти.
export function AnonFavoriteSheet({
  open,
  onClose,
  onLogin,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet cab-anon-sheet"
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
        <DialogTitle className="aroma-mix-sheet-title">Избранное хранится в кабинете</DialogTitle>
        <DialogDescription className="aroma-mix-sheet-desc">
          Войдите через Telegram, чтобы сохранить микс.
        </DialogDescription>
        <div className="cab-sheet-actions">
          <button type="button" className="aroma-mix-sheet-ghost" onClick={onClose}>
            Не сейчас
          </button>
          <CTA onClick={onLogin}>Войти</CTA>
        </div>
      </DialogContent>
    </Dialog>
  );
}
