// Импортировать только через React.lazy: модуль тянет Remotion отдельным чанком.
import { Player, type PlayerRef } from '@remotion/player';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useCurrentFrame } from 'remotion';
import { pickScene, type ReelSceneSpec } from '@/lib/reel-scene';
import type { ReelMix } from './ReelStill';
import { SCENE_FPS, SCENE_FRAMES, SceneSvg } from './scenes/SceneSvg';

function SceneComposition({ spec, seed }: { spec: ReelSceneSpec; seed: string }) {
  return <SceneSvg spec={spec} seed={seed} frame={useCurrentFrame()} />;
}

/** Анимированная сцена рилса: бесшовный цикл, без контролов и без паузы по клику —
 *  паузой управляет `playing`. Заполняет ближайший позиционированный контейнер. */
export default function ReelPlayer({ mix, playing }: { mix: ReelMix; playing: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const inputProps = useMemo(() => ({ spec: pickScene(mix), seed: mix.id }), [mix]);

  // Player вписывает композицию с полями; размер композиции = размер контейнера,
  // чтобы сцена легла на весь экран без полей и без растяжения.
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const measure = () => {
      const width = Math.round(box.clientWidth);
      const height = Math.round(box.clientHeight);
      if (width > 0 && height > 0) setSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.play();
    else player.pause();
  }, [playing, size]);

  return (
    <div ref={boxRef} style={{ position: 'absolute', inset: 0 }} aria-hidden>
      {size ? (
        <Player
          ref={playerRef}
          component={SceneComposition}
          inputProps={inputProps}
          durationInFrames={SCENE_FRAMES}
          fps={SCENE_FPS}
          compositionWidth={size.width}
          compositionHeight={size.height}
          style={{ width: '100%', height: '100%' }}
          autoPlay={playing}
          loop
          controls={false}
          clickToPlay={false}
          doubleClickToFullscreen={false}
          spaceKeyToPlayOrPause={false}
          // Звука в сценах нет: без общих аудиотегов браузер не блокирует автозапуск.
          initiallyMuted
          numberOfSharedAudioTags={0}
          acknowledgeRemotionLicense
        />
      ) : null}
    </div>
  );
}
