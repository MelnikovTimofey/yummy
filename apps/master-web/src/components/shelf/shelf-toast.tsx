import { useEffect, useState } from 'react';
import { CircleCheck, TriangleAlert } from 'lucide-react';

export type ShelfToastData = {
  id: number;
  title: string;
  text: string;
  error?: boolean;
  undo?: () => Promise<unknown>;
  action?: { label: string; onClick: () => void };
};

const UNDO_SECONDS = 10;
const NOTE_SECONDS = 5;

// Тост полки и поставок: с отменой живёт 10 с, просто уведомление — 5 с.
export const ShelfToast = ({ toast, onUndo, onClose }: { toast: ShelfToastData; onUndo: () => void; onClose: () => void }) => {
  const total = toast.undo ? UNDO_SECONDS : NOTE_SECONDS;
  const [left, setLeft] = useState(total);

  useEffect(() => {
    setLeft(total);
    const timer = window.setInterval(() => setLeft((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [toast.id, total]);

  useEffect(() => {
    if (left <= 0) onClose();
  }, [left, onClose]);

  return (
    <div className="shelf-toast" role="status" data-tone={toast.error ? 'danger' : undefined}>
      {toast.error ? <TriangleAlert size={16} aria-hidden /> : <CircleCheck size={16} aria-hidden />}
      <p>
        <b>{toast.title}</b>
        {toast.text ? ` — ${toast.text}` : null}
      </p>
      {toast.action ? (
        <button
          type="button"
          className="btn"
          data-size="sm"
          onClick={() => {
            onClose();
            toast.action?.onClick();
          }}
        >
          {toast.action.label}
        </button>
      ) : null}
      {toast.undo ? (
        <>
          <span className="shelf-toast__timer">{left} с</span>
          <button type="button" className="btn" data-size="sm" onClick={onUndo}>
            Отменить <span className="kbd">Z</span>
          </button>
        </>
      ) : (
        <button type="button" className="icon-btn" aria-label="Закрыть уведомление" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};
