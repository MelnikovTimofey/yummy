const fallbackText = 'Не получилось. Попробуйте ещё раз.';

// status 0 — ответа нет (сеть, таймаут), message тогда уже русский.
export class RequestError extends Error {
  status: number;

  constructor(status: number, message = fallbackText) {
    super(message);
    this.status = status;
  }
}

// Поле `error` из ответа backend — служебное и английское (#267), гостю
// показывается только текст, выбранный здесь по статусу.
export const guestErrorText = (cause: unknown, byStatus: Record<number, string> = {}) =>
  cause instanceof RequestError ? byStatus[cause.status] ?? cause.message : fallbackText;
