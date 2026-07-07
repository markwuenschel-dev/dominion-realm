/**
 * A stand-in for a missing content image — an aspect-correct panel with the
 * entry's monogram. Fills its (position:relative) container, so it drops into the
 * same sized boxes a real image uses (cast card, codex card). Signals "art can go
 * here" and keeps the layout stable until a picture is uploaded in Keystatic.
 */
export function MediaPlaceholder({ label, className }: { label?: string; className?: string }) {
  const mark = label?.trim().charAt(0).toUpperCase() || '◈';
  return (
    <div className={`media-placeholder${className ? ` ${className}` : ''}`} aria-hidden="true">
      <span className="media-placeholder__mark">{mark}</span>
    </div>
  );
}
