import { CTA } from '@/components/aroma';

// Конец ленты (#298): после последнего микса — приглашение в «Намиксуй».
// Миксер открывается кнопкой, а не жестом: свайп дальше ничего не делает.
export function FeedEnd({ onMixer }: { onMixer: () => void }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      <h2 className="aroma-recs-empty-title">Это все миксы</h2>
      <p className="reel-empty-text">Можно собрать свой.</p>
      <CTA onClick={onMixer} style={{ marginTop: 8 }}>
        Намиксуй
      </CTA>
    </section>
  );
}
