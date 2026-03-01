import { FormEvent, useState } from 'react';
import { sendMagicLink, verifyMagicLink } from '../shared/apiClient';
import { AuthState } from '../shared/types';
import { AppButton, AppInput } from '@/ui-kit';

type AuthScreenProps = {
  onAuthUpdate: (next: AuthState) => void;
  asCard?: boolean;
};

export const AuthScreen = ({ onAuthUpdate, asCard = true }: AuthScreenProps) => {
  const [email, setEmail] = useState('seed@yummy.local');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onRequestLink = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      await sendMagicLink(email.trim());
      setStatus('Ссылка отправлена. Скопируйте token из письма и вставьте ниже.');
    } catch {
      setError('Не удалось отправить ссылку. Проверьте API и Mailpit.');
    } finally {
      setPending(false);
    }
  };

  const onVerifyToken = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setStatus(null);

    try {
      const response = await verifyMagicLink(token.trim());
      onAuthUpdate({
        tokens: {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        },
        user: response.user,
      });
    } catch {
      setError('Токен недействителен или истёк.');
    } finally {
      setPending(false);
    }
  };

  const content = (
    <>
      <p className="card-title">Вход в Yummy</p>
      <p className="card-text">MVP использует вход по magic link через почту.</p>

      <form className="form" onSubmit={onRequestLink}>
        <label htmlFor="email">E-mail</label>
        <AppInput
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
        />
        <AppButton type="submit" disabled={pending}>Отправить magic link</AppButton>
      </form>

      <form className="form" onSubmit={onVerifyToken}>
        <label htmlFor="token">Token из письма</label>
        <AppInput
          id="token"
          type="text"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          required
          placeholder="Вставьте token"
        />
        <AppButton type="submit" disabled={pending}>Войти</AppButton>
      </form>

      {status ? <p className="status ok">{status}</p> : null}
      {error ? <p className="status error">{error}</p> : null}
    </>
  );

  if (!asCard) {
    return <div className="auth-layout">{content}</div>;
  }

  return (
    <div className="auth-layout">
      <section className="auth-card">
        {content}
      </section>
    </div>
  );
};
