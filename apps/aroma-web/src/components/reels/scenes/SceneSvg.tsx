import type { SceneMotif } from '@/lib/reel-scene';
import { BerryScene } from './BerryScene';
import { BloomScene } from './BloomScene';
import { FrostScene } from './FrostScene';
import { GeneralScene } from './GeneralScene';
import { JuicyScene } from './JuicyScene';
import type { SceneProps } from './kit';
import { SmokeScene } from './SmokeScene';
import { WarmScene } from './WarmScene';

export { SCENE_FPS, SCENE_FRAMES, type SceneProps } from './kit';

const SCENES: Record<SceneMotif, (props: SceneProps) => React.JSX.Element> = {
  frost: FrostScene,
  bloom: BloomScene,
  juicy: JuicyScene,
  berry: BerryScene,
  warm: WarmScene,
  smoke: SmokeScene,
  general: GeneralScene,
};

/** Фон рилса по главному мотиву. Чистая функция кадра, без Remotion. */
export function SceneSvg(props: SceneProps) {
  const Scene = SCENES[props.spec.primary];
  return <Scene {...props} />;
}
