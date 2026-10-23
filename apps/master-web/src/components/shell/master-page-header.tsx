import type { ReactNode } from 'react';

type MasterPageHeaderProps = {
  /** Надзаголовок — по канону #348 в разделах не ставится; остался у карточки поставки до #365 */
  eyebrow?: string;
  /** Main page title — рендерится как `<h1>` Source Serif 4, 36px/1.05 */
  title: string;
  /** Подзаголовок — только если сообщает неочевидное */
  subtitle?: string;
  /** Правый блок — primary action + ghost-actions (рендерится в сетке справа) */
  actions?: ReactNode;
  /** Дополнительный slot правее actions — для служебных ссылок типа /staff/audit/events */
  meta?: ReactNode;
};

// Шапка раздела: serif h1 и справа мета и действия. Мета через запятую:
// «290 позиций, 61,9 кг» (#348, design/design_handoff_ui_deslop).
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
