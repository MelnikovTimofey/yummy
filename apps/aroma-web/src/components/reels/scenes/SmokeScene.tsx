import { SceneFrame, type SceneProps } from './kit';

/** Дым: струи — S-кривые — прорисовываются снизу вверх и тают. Сцена по умолчанию. */
export function SmokeScene(props: SceneProps) {
  return <SceneFrame {...props} />;
}
