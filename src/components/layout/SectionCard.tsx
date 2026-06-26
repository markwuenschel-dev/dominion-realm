import type { ReactNode } from 'react';

interface SectionCardProps {
  section?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function SectionCard({
  section,
  title,
  subtitle,
  children,
  className = '',
  headerRight,
}: SectionCardProps) {
  return (
    <div className={`rounded-lg border border-rim bg-panel p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          {section && <span className="stat-value text-xs text-realm-gold-dim">{section}</span>}
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}
