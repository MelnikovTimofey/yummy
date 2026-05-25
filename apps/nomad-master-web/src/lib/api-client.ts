export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021';
export const apiHostLabel = apiBaseUrl.replace(/^https?:\/\//, '');

export const envLabel = (() => {
  const explicit = import.meta.env.VITE_ENV_NAME as string | undefined;
  if (explicit) return explicit;
  const host = apiHostLabel.toLowerCase();
  if (host.includes('localhost') || host.startsWith('127.')) return 'local';
  if (host.includes('stage') || host.includes('staging')) return 'stage';
  return 'prod';
})();

export const requestJson = async <T,>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> => {
  const hasBody = options.body !== undefined;
  const headers = new Headers(options.headers ?? {});

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let payload: { error?: string } | unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text) as { error?: string } | unknown;
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const error =
      payload && typeof payload === 'object' && 'error' in payload
        ? String(payload.error)
        : 'Запрос не выполнен';
    const wrapped = new Error(error) as Error & { status?: number };
    wrapped.status = response.status;
    throw wrapped;
  }

  return (payload ?? {}) as T;
};
