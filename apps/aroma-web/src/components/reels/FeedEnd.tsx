import { CTA } from '@/components/aroma';

// Конец ленты (#298, #349): после последнего микса — приглашение в «Намиксуй».
// Миксер открывается кнопкой, а не жестом: свайп дальше ничего не делает.
export function FeedEnd({ onMixer }: { onMixer: () => void }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      <h2 className="aroma-recs-empty-title">Это все миксы</h2>
      <CTA onClick={onMixer} style={{ marginTop: 8 }}>
        Собрать свой микс
      </CTA>
    </section>
  );
}
