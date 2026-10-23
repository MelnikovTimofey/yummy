import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';

export type ShelfToastData = {
  id: number;
  title: string;
  text: string;
  error?: boolean;
  // Пояснение, а не ошибка: отметка выше расчёта (#shot=edge-more).
  warn?: boolean;
  undo?: () => Promise<unknown>;
  action?: { label: string; onClick: () => void };
};

const UNDO_SECONDS = 10;
const NOTE_SECONDS = 5;

// Тост полки и поставок: с отменой живёт 10 с, просто уведомление — 5 с.
// Название жирной строкой, текст ниже отдельным предложением; иконка только у ошибки (#363).
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
    <div className="shelf-toast" role="status" data-tone={toast.error ? 'danger' : toast.warn ? 'warning' : undefined}>
      {toast.error ? <TriangleAlert size={16} aria-hidden /> : null}
      <p>
        <b>{toast.title}</b>
        {toast.text ? <span>{toast.text}</span> : null}
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
          <button type="button" className="btn" data-size="sm" title="Клавиша Z" onClick={onUndo}>
            Отменить
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
