import { useState } from 'react';
import { mixPhotoSrc, pickMixPhoto } from '@/lib/mix-photo';
import type { ReelMix } from './ReelStill';

type ReelPhotoSource = { src: string; onError: () => void };

/** Фото вкуса под сценой рилса (#597). null — вкус не узнан или файл не загрузился:
 *  сцена остаётся на своей заливке, как раньше. */
export function useReelPhoto(mix: ReelMix | null): ReelPhotoSource | null {
  const photo = mix ? pickMixPhoto(mix) : null;
  const src = photo ? mixPhotoSrc(photo, 'reel') : null;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return src && failedSrc !== src ? { src, onError: () => setFailedSrc(src) } : null;
}

/** Неподвижный фон: чуть притушен, чтобы линии сцены и текст афиши читались. */
export function ReelPhoto({ photo, eager = false }: { photo: ReelPhotoSource; eager?: boolean }) {
  return (
    <img
      className="reel-photo"
      src={photo.src}
      alt=""
      decoding="async"
      loading={eager ? undefined : 'lazy'}
      onError={photo.onError}
    />
  );
}
