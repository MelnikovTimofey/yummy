const masterModules = [
  'Авторизация staff',
  'Инвентаризация',
  'Менеджер миксов',
  'Менеджер рейлов',
  'Дашборды по аналитике и наличию',
];

export const App = () => {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Nomad</p>
        <h1>Мастер</h1>
        <p className="lead">Отдельный backoffice-контур для кальянных мастеров и администратора.</p>
      </section>

      <section className="card">
        <h2>Модули MVP</h2>
        <ul>
          {masterModules.map((moduleName) => (
            <li key={moduleName}>{moduleName}</li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Технический контур</h2>
        <p>API: {import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3021'}</p>
        <p>Стадия: scaffold для параллельной Nomad-разработки.</p>
      </section>
    </main>
  );
};
