import Link from 'next/link';

export function AppNav() {
  return (
    <nav className="border-b border-rim bg-panel/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="heading-realm text-base">Dominion Realm</span>
          <span className="text-rim-bright text-xs">·</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Author Tools
          </span>
        </div>

        <div className="flex items-center gap-1">
          <NavLink href="/calculator" label="Formula Calculator" />
          <NavLink href="/sheet" label="Stat Sheet" />
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {label}
    </Link>
  );
}
