import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

// Подтверждение удаления кабинета (#243, мокап cab-delete). Без шуток.
export function DeleteCabinetSheet({
  open,
  deleting,
  error,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  deleting: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !deleting && onCancel()}>
      <DialogContent
        showCloseButton={false}
        className="aroma-mix-sheet cab-delete-sheet"
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
        <DialogTitle className="aroma-mix-sheet-title">Удалить кабинет?</DialogTitle>
        <DialogDescription className="aroma-mix-sheet-desc">
          История, избранное и вкусы удалятся насовсем. Выборы миксов останутся в статистике заведения, но без связи с
          вами.
        </DialogDescription>
        {error ? (
          <p className="cab-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="cab-sheet-actions">
          <button type="button" className="aroma-mix-sheet-ghost" onClick={onCancel} disabled={deleting}>
            Отмена
          </button>
          <button type="button" className="aroma-mix-sheet-ghost cab-danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Удаляем…' : 'Удалить'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
