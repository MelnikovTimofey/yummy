// Пустая лента (#263, кадр reel-empty): ни одного доступного микса. Факт первым, затем выход на Подбор.
export function FeedEmpty({ onRecs }: { onRecs: () => void }) {
  return (
    <section className="reel-empty">
      <img className="reel-empty-mark" src="/logo-mark.svg" width="54" height="78" alt="" aria-hidden />
      <p className="aroma-caps">Рилсы</p>
      <h1 className="aroma-recs-empty-title">Сейчас показать нечего</h1>
      <p className="aroma-recs-empty-text">Ни одного микса в наличии. Мастер уже в курсе — спросите его, что будет сегодня.</p>
      <button type="button" className="aroma-mix-sheet-ghost" onClick={onRecs}>
        К подбору
      </button>
    </section>
  );
}
