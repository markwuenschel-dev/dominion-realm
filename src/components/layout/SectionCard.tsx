import type { ReactNode } from 'react'

interface SectionCardProps {
  section?: string
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export function SectionCard({ section, title, subtitle, children, className = '' }: SectionCardProps) {
  return (
    <div className={`rounded-lg border border-rim bg-panel p-5 ${className}`}>
      <div className="mb-4">
        {section && (
          <span className="stat-value text-xs text-realm-gold-dim">{section}</span>
        )}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}
