import { CTA, SmokeMark } from '@/components/aroma';

// Ожидание входа через бота (#239, #243; мокап cab-tg и cab-tg-expired).
// «Открыть Telegram ещё раз» — настоящая ссылка: нажатие на t.me надёжнее
// всего открывает приложение Telegram на iPhone.
export function LoginWait({
  expired,
  botUrl,
  restarting,
  onRestart,
  onCancel,
}: {
  expired: boolean;
  botUrl: string;
  restarting: boolean;
  onRestart: () => void;
  onCancel: () => void;
}) {
  return (
    <section className="cab-anon cab-wait">
      {expired ? (
        <>
          <h1 className="cab-anon-title">Ссылка устарела</h1>
          <p className="cab-anon-note">Ссылка для входа живёт 10 минут. Начнём заново?</p>
          <div className="cab-anon-form">
            <CTA busy={restarting} onClick={onRestart}>
              Войти через Telegram
            </CTA>
            <button type="button" className="aroma-onboarding-skip" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 className="cab-anon-title">Подтвердите вход в Telegram</h1>
          <p className="cab-wait-text">
            Мы открыли чат с ботом Арома Ателье. Нажмите там «Запустить», и кабинет откроется здесь.
          </p>
          <p className="cab-wait-status busy-inline" role="status">
            <SmokeMark inline />
            Ждём подтверждения
          </p>
          <div className="cab-anon-form">
            <a className="aroma-mix-sheet-ghost cab-wait-open" href={botUrl}>
              Открыть Telegram ещё раз
            </a>
            <button type="button" className="aroma-onboarding-skip" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </>
      )}
    </section>
  );
}
