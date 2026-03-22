const guestSteps = [
  'Подтверждение 18+',
  'Ввод daily code',
  'Знакомство с сервисом',
  'Онбординг по вкусам',
  'Рекомендации и карточка микса',
];

export const App = () => {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Nomad</p>
        <h1>Арома Ателье</h1>
        <p className="lead">
          Отдельный guest-frontend для нового Nomad-сценария. Legacy Yummy не затрагивается.
        </p>
      </section>

      <section className="card">
        <h2>План первого vertical slice</h2>
        <ul>
          {guestSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Технический контур</h2>
        <p>API: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021'}</p>
        <p>Статус: scaffold готов для дальнейшей feature-разработки.</p>
      </section>
    </main>
  );
};
