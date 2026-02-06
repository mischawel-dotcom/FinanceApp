
import { ReactNode } from 'react';
import { cardBase, cardHeader, cardTitle, cardSubtitle, cardActions, cardBody } from './tw';

interface CardProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function Card({ children, title, subtitle, actions, className = '' }: CardProps) {
  return (
    <div className={[cardBase, className].join(' ')}>
      {(title || subtitle || actions) && (
        <div className={cardHeader}>
          <div>
            {title && <h3 className={cardTitle}>{title}</h3>}
            {subtitle && <p className={cardSubtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={cardActions}>{actions}</div>}
        </div>
      )}
      <div className={cardBody}>{children}</div>
    </div>
  );
}
