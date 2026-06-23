import { ArrowRight, AlertCircle, Eye, EyeOff, Lock, User } from 'lucide-react';
import { FormEvent, KeyboardEvent, useState } from 'react';

type LoginScreenStatus = 'idle' | 'loading' | 'ready' | 'error';

export type LoginScreenProps = {
  login: string;
  password: string;
  status: LoginScreenStatus;
  error: string;
  onLoginChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  version?: string;
};

export const LoginScreen = ({
  login,
  password,
  status,
  error,
  onLoginChange,
  onPasswordChange,
  onSubmit,
  version,
}: LoginScreenProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const loading = status === 'loading';
  const submitLabel = loading ? 'Проверяем…' : 'Войти';

  const onPasswordKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (typeof event.getModifierState === 'function') {
      setCapsOn(event.getModifierState('CapsLock'));
    }
  };

  const toggleReveal = () => setShowPassword((prev) => !prev);

  return (
    <main className="auth-screen" id="main-content">
      <a className="skip-link" href="#main-content">Перейти к содержимому</a>

      <div className="auth-screen__container">
        <div className="auth-screen__brand" aria-label="Ателье · Мастер">
          <div className="auth-screen__mark" aria-hidden="true">А</div>
          <div className="auth-screen__brand-name">
            Ателье <em>Мастер</em>
          </div>
        </div>

        <section className="auth-screen__card">
          <h1 className="auth-screen__title">Войти в смену</h1>
          <p className="auth-screen__subtitle">
            Операционная консоль для кальянных мастеров и администраторов.
          </p>

          <form className="auth-screen__form" onSubmit={onSubmit} autoComplete="on" noValidate>
            <div>
              <label htmlFor="auth-login" className="auth-screen__field-label">
                <span>Логин</span>
              </label>
              <div className="auth-screen__input">
                <User className="auth-screen__icon" aria-hidden="true" />
                <input
                  id="auth-login"
                  name="username"
                  type="text"
                  autoComplete="username"
                  spellCheck={false}
                  autoCapitalize="none"
                  placeholder="admin"
                  required
                  autoFocus
                  value={login}
                  onChange={(event) => onLoginChange(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="auth-screen__field-label">
                <span>Пароль</span>
              </label>
              <div className="auth-screen__input">
                <Lock className="auth-screen__icon" aria-hidden="true" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  onKeyDown={onPasswordKey}
                  onKeyUp={onPasswordKey}
                  onBlur={() => setCapsOn(false)}
                />
                <button
                  type="button"
                  className="auth-screen__reveal"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  aria-pressed={showPassword}
                  title={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  onClick={toggleReveal}
                >
                  {showPassword ? (
                    <EyeOff width={16} height={16} aria-hidden="true" />
                  ) : (
                    <Eye width={16} height={16} aria-hidden="true" />
                  )}
                </button>
              </div>
              <div className="auth-screen__caps" data-on={capsOn ? 'true' : 'false'}>
                <span className="auth-screen__caps-dot" />
                <span>Включён Caps Lock</span>
              </div>
            </div>

            <div
              className="auth-screen__error"
              data-on={error ? 'true' : 'false'}
              role="alert"
            >
              <AlertCircle className="auth-screen__error-icon" aria-hidden="true" />
              <span>{error}</span>
            </div>

            <button
              type="submit"
              className="auth-screen__submit"
              disabled={loading}
            >
              <span>{submitLabel}</span>
              <ArrowRight className="auth-screen__submit-icon" aria-hidden="true" />
            </button>
          </form>
        </section>

        {version ? (
          <div className="auth-screen__foot">
            v{version}
          </div>
        ) : null}
      </div>
    </main>
  );
};
