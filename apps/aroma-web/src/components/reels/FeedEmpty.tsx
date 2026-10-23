// Пустая лента (#263, кадр reel-empty): ни одного доступного микса. Факт первым, затем выход на Подбор.
export function FeedEmpty({ onRecs }: { onRecs: () => void }) {
  return (
    <section className="reel-empty">
      <img className="reel-empty-mark" src="/logo-mark.svg" width="56" height="56" alt="" aria-hidden />
      <h1 className="aroma-recs-empty-title">Миксов в наличии нет</h1>
      <p className="reel-empty-text">Спросите мастера, что есть сегодня.</p>
      <button type="button" className="aroma-mix-sheet-ghost" onClick={onRecs}>
        К подбору
      </button>
    </section>
  );
}
