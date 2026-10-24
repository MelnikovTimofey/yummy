import { lazy, Suspense } from 'react';
import { MixerInvite } from '@/components/mixer/MixerInvite';
import { ReelStill, type ReelMix } from './ReelStill';

const ReelPlayer = lazy(() => import('./ReelPlayer'));

// Фон конца ленты — сцена «Дым» без микса: лента не обрывается в пустой экран.
const END_SCENE: ReelMix = { id: 'feed-end', flavors: ['табачный'], flavorProfiles: [] };

// Конец ленты (#298, #349): после последнего микса — та же кнопка в «Намиксуй»,
// что в конце Подбора. Миксер открывается кнопкой, а не жестом: свайп дальше
// ничего не делает.
export function FeedEnd({ onMixer, playing }: { onMixer: () => void; playing: boolean }) {
  return (
    <section className="reel-end" aria-label="Конец ленты">
      {playing ? (
        <Suspense fallback={<ReelStill mix={END_SCENE} />}>
          <ReelPlayer mix={END_SCENE} playing />
        </Suspense>
      ) : (
        <ReelStill mix={END_SCENE} />
      )}
      <MixerInvite onOpen={onMixer} />
    </section>
  );
}
