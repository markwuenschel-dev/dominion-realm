'use client';

export { Label } from '@radix-ui/react-label';
export { Separator } from '@radix-ui/react-separator';

// Slider — thin wrapper around Radix so JSX stays identical to shadcn shape
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

export function Slider({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-rim-bright">
        <SliderPrimitive.Range className="absolute h-full bg-realm-gold" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-realm-gold bg-surface shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-realm-gold disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  );
}

// Minimal pass-through stubs for components not yet needed
export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn('inline-flex items-center rounded px-2 py-0.5 text-xs font-medium', className)}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn('rounded px-3 py-1.5 text-sm transition-colors', className)}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'rounded border border-rim bg-panel-raised px-2 py-1 text-sm text-foreground',
        props.className,
      )}
    />
  );
}
