import { useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { X } from 'lucide-react';
import { slideImage, stepSlide, swipeStep, type WhatsNewAction, type WhatsNewRelease } from '@/lib/whats-new';

type WhatsNewDialogProps = {
  release: WhatsNewRelease;
  isPhone: boolean;
  // Любое закрытие — крестик, Esc, клик по фону, «Готово» — отмечает выпуск просмотренным.
  onClose: () => void;
  onAction: (action: WhatsNewAction) => void;
};

// Окно «Что нового» (#226, #shot=slide-1, slide-list, phone-1): слайды выпуска,
// ← → и свайп листают. Монтируется открытым — каждый показ начинается с первого слайда.
export const WhatsNewDialog = ({ release, isPhone, onClose, onAction }: WhatsNewDialogProps) => {
  const [index, setIndex] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const count = release.slides.length;
  const slide = release.slides[index];
  const last = index === count - 1;
  const image = slideImage(slide, isPhone);
  const go = (delta: number) => setIndex((current) => stepSlide(current, delta, count));

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="wn-scrim" />
        <Dialog.Content
          className={`wn${isPhone ? ' wn--phone' : ''}`}
          aria-describedby={undefined}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') go(1);
            else if (event.key === 'ArrowLeft') go(-1);
            else return;
            event.preventDefault();
          }}
          onTouchStart={(event) => {
            touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
          }}
          onTouchEnd={(event) => {
            if (!touch.current) return;
            const end = event.changedTouches[0];
            const step = swipeStep(end.clientX - touch.current.x, end.clientY - touch.current.y);
            touch.current = null;
            if (step) go(step);
          }}
        >
          <header className="wn-head">
            {/* Заголовок окна — подпись, а не heading: заголовок слайда — h2 ниже. */}
            <Dialog.Title asChild>
              <p className="wn-head__title">
                Что нового, <b>{release.label}</b>
              </p>
            </Dialog.Title>
            <Dialog.Close className="wn-x" aria-label="Закрыть">
              <X size={16} strokeWidth={1.8} aria-hidden />
            </Dialog.Close>
          </header>

          <div className={`wn-visual${image?.contain ? ' wn-visual--contain' : ''}`}>
            {image ? (
              <img key={image.src} src={image.src} alt={slide.title} loading="lazy" />
            ) : 'list' in slide ? (
              <ul className="wn-list">
                {slide.list.map((item) => (
                  <li key={item} className="wn-list__item">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="wn-copy">
            <h2>{slide.title}</h2>
            {slide.text ? <p>{slide.text}</p> : null}
          </div>

          <footer className="wn-foot">
            <div className="wn-pips">
              {release.slides.map((item, pip) => (
                <button
                  key={item.title}
                  type="button"
                  className="wn-pip"
                  aria-label={`Слайд ${pip + 1} из ${count}`}
                  aria-current={pip === index ? 'step' : undefined}
                  onClick={() => setIndex(pip)}
                />
              ))}
            </div>
            {slide.action && !isPhone ? (
              <button type="button" className="wn-btn wn-btn--link" onClick={() => onAction(slide.action!)}>
                {slide.action.label}
              </button>
            ) : null}
            <button type="button" className="wn-btn wn-btn--ghost" disabled={index === 0} onClick={() => go(-1)}>
              Назад
            </button>
            <button type="button" className="wn-btn wn-btn--primary" onClick={() => (last ? onClose() : go(1))}>
              {last ? 'Готово' : 'Далее'}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
