import { ChevronUp } from 'lucide-react';

// Последний блок Подбора (#349): рилсы продолжают его. Открывается касанием или
// дотягиванием за край.
export function ReelsTeaser({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button type="button" className="reels-teaser" onClick={onOpen}>
      <ChevronUp size={18} strokeWidth={1.8} aria-hidden />
      <span className="reels-teaser-text">{label}</span>
    </button>
  );
}
