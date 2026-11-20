import { pickScene } from '@/lib/reel-scene';
import { SceneSvg } from './scenes/SceneSvg';

export type ReelMix = { id: string; name?: string; flavors: string[]; flavorProfiles: string[] };

// Середина цикла: цветок раскрыт, струи дыма прорисованы.
const STILL_FRAME = 90;

/** Статичный кадр сцены без Remotion: соседние рилсы, дотягивание из Подбора, prefers-reduced-motion.
 *  Заполняет ближайший позиционированный контейнер. onPhoto — под сценой фото вкуса. */
export function ReelStill({ mix, frame = STILL_FRAME, onPhoto = false }: { mix: ReelMix; frame?: number; onPhoto?: boolean }) {
  return <SceneSvg spec={pickScene(mix)} seed={mix.id} frame={frame} onPhoto={onPhoto} />;
}
