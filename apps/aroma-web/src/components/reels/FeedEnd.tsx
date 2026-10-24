import { MixerInvite } from '@/components/mixer/MixerInvite';

// Конец ленты (#298, #349): после последнего микса — та же кнопка в «Намиксуй»,
// что в конце Подбора. Миксер открывается кнопкой, а не жестом: свайп дальше
// ничего не делает.
export function FeedEnd({ onMixer }: { onMixer: () => void }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      <MixerInvite onOpen={onMixer} />
    </section>
  );
}
