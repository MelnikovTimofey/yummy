import { useState } from 'react';

import { CTA, ProfileGlyph } from '@/components/aroma';
import { cn } from '@/lib/utils';

const POLICY_URL = 'https://nomadlounge.ru/agreement/';

export const CABINET_GLYPH = ['berry', 'citrus', 'minty'];

// Кабинет без входа (#243, мокап cab-anon). Без бота — только объяснение.
export function CabinetAnon({
  canLogin,
  starting,
  error,
  onLogin,
}: {
  canLogin: boolean;
  starting: boolean;
  error: string;
  onLogin: () => void;
}) {
  const [consent, setConsent] = useState(false);
  const disabled = !consent || starting;

  return (
    <section className="cab-anon">
      <ProfileGlyph profiles={CABINET_GLYPH} size={72} />
      <p className="aroma-caps">Кабинет</p>
      <h1 className="cab-anon-title">Запомним, что вам понравилось</h1>
      <ul className="cab-benefits">
        <li>
          <span className="cab-dot" aria-hidden />
          История: что и когда вы выбирали
        </li>
        <li>
          <span className="cab-dot" aria-hidden />
          Избранное — любимые и собранные вами миксы
        </li>
        <li>
          <span className="cab-dot" aria-hidden />
          «Для вас» на Подборе — без онбординга в следующий раз
        </li>
      </ul>
      <p className="cab-anon-note">Без входа всё работает как прежде. Кабинет действует в этом заведении.</p>

      {canLogin ? (
        <div className="cab-anon-form">
          <div className="aroma-access-age">
            <button
              type="button"
              role="checkbox"
              aria-checked={consent}
              aria-labelledby="cab-consent-text"
              className={cn('aroma-access-age-dot', consent && 'aroma-access-age-dot-on')}
              onClick={() => setConsent(!consent)}
            >
              {consent ? <span aria-hidden>✓</span> : null}
            </button>
            <span className="aroma-access-age-text">
              <span id="cab-consent-text" onClick={() => setConsent(!consent)}>
                Согласен на обработку Telegram id для истории и избранного.
              </span>{' '}
              <a className="cab-link" href={POLICY_URL} target="_blank" rel="noreferrer">
                Политика
              </a>
            </span>
          </div>
          <CTA disabled={disabled} onClick={onLogin}>
            {starting ? 'Открываем Telegram…' : 'Войти через Telegram'}
          </CTA>
          {error ? (
            <p className="cab-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
