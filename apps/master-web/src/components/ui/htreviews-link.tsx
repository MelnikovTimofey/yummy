import { ArrowUpRight } from 'lucide-react';

// Карточка табака на htreviews: отзывы и обсуждения живут там, к себе их не переносим.
export const HtreviewsLink = ({ href }: { href: string }) => (
  <a className="htreviews-link" href={href} target="_blank" rel="noopener noreferrer">
    htreviews
    <ArrowUpRight size={13} aria-hidden />
  </a>
);
