import type { TextSegment } from '@/lib/reorder';

// Подпись из кусков с выделением — настройки полки и блок «Полка» дашборда (#326).
export const Segments = ({ segments }: { segments: TextSegment[] }) => (
  <>
    {segments.map((segment, index) =>
      segment.strong ? (
        <b key={index} data-tone={segment.tone}>
          {segment.text}
        </b>
      ) : (
        <span key={index}>{segment.text}</span>
      ),
    )}
  </>
);
