import { CTA, ProfileGlyph } from '@/components/aroma';

// Конец ленты (#298): после последнего микса — приглашение в «Намиксуй».
// Миксер открывается кнопкой, а не жестом: свайп дальше ничего не делает.
export function FeedEnd({ onMixer }: { onMixer: () => void }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      <ProfileGlyph profiles={['berry', 'citrus', 'minty']} size={64} />
      <h2 className="aroma-recs-empty-title">Не нашли своё?</h2>
      <p className="aroma-recs-empty-text">Соберите микс сами — мастер подскажет.</p>
      <CTA onClick={onMixer} style={{ marginTop: 8 }}>
        Намиксуй
      </CTA>
    </section>
  );
}
