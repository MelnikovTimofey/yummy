import type { ReactNode } from 'react';

type MasterPageHeaderProps = {
  /** eyebrow uppercase mono mini (e.g. «ИНВЕНТАРИЗАЦИЯ», «МЕНЕДЖЕР МИКСОВ») */
  eyebrow?: string;
  /** Main page title — рендерится как `<h1>` Fraunces огромный */
  title: string;
  /** 1-line lead под заголовком */
  subtitle?: string;
  /** Правый блок — primary action + ghost-actions (рендерится в сетке справа) */
  actions?: ReactNode;
  /** Дополнительный slot правее actions — для mono-ссылок типа /staff/audit/events */
  meta?: ReactNode;
};

// Унифицированный page-header под mockups.html прототипа master-refactor:
// eyebrow + большой serif h1 + subtitle + правое крыло actions / meta.
// Использовать в каждом экране (Tobaccos / Mixes / Rails / Access / Dashboard).
// Заменяет старый паттерн «section-head с h2 внутри» — теперь h1 это label
// текущего workspace, без вложенной h2.
export const MasterPageHeader = ({
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}: MasterPageHeaderProps) => (
  <header className="master-page-header">
    <div className="master-page-header__copy">
      {eyebrow ? <p className="master-page-header__eyebrow">{eyebrow}</p> : null}
      <h1 className="master-page-header__title">{title}</h1>
      {subtitle ? <p className="master-page-header__subtitle">{subtitle}</p> : null}
    </div>
    {actions || meta ? (
      <div className="master-page-header__right">
        {meta ? <div className="master-page-header__meta">{meta}</div> : null}
        {actions ? <div className="master-page-header__actions">{actions}</div> : null}
      </div>
    ) : null}
  </header>
);
