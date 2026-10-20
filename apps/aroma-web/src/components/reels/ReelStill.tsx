import { pickScene } from '@/lib/reel-scene';
import { SceneSvg } from './scenes/SceneSvg';

export type ReelMix = { id: string; flavors: string[]; flavorProfiles: string[] };

// Середина цикла: цветок раскрыт, струи дыма прорисованы.
const STILL_FRAME = 90;

/** Статичный кадр сцены без Remotion: соседние рилсы, кружки полосы, prefers-reduced-motion.
 *  Заполняет ближайший позиционированный контейнер. */
export function ReelStill({ mix, frame = STILL_FRAME }: { mix: ReelMix; frame?: number }) {
  return <SceneSvg spec={pickScene(mix)} seed={mix.id} frame={frame} />;
}
