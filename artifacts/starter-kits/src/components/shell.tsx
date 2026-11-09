import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Compass, LayoutGrid, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { communityLinks } from '@/lib/community-links';

const nav = [
  { href: '/', label: 'Library', icon: LayoutGrid },
  { href: '/getting-started', label: 'Getting started', icon: Compass },
  { href: '/reference', label: 'API reference', icon: BookOpen },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [loc]);
  const isActive = (href: string) => (href === '/' ? loc === '/' || loc.startsWith('/kits') : loc.startsWith(href));
  return (
    <div className="flex-1 flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-xl">
          Skip to main content
        </a>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 min-w-0" data-testid="link-home" aria-label="Launchpad home">
            <img src={`${import.meta.env.BASE_URL}brand/launchpad-zebra.png`} width={36} height={36} alt="" aria-hidden="true" className="w-9 h-9 object-contain shrink-0" data-testid="image-header-zebra" />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-semibold text-[17px] text-foreground">Launchpad</span>
              <span className="text-xs text-muted-foreground truncate">Community starter kits</span>
            </span>
          </Link>
          <button type="button" className="md:hidden ml-auto p-2 rounded-xl border hover:bg-secondary" aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)} data-testid="button-mobile-nav">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        <div className="border-t hidden md:block">
          <nav aria-label="Primary" className="max-w-6xl mx-auto px-4 flex items-center gap-6 h-12">
            {nav.map(({ href, label }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined} data-testid={`link-nav-${label.toLowerCase().replace(' ', '-')}`}
                  className={cn('relative h-full flex items-center gap-1.5 text-sm transition-colors border-b-2',
                    active ? 'border-[#0f172a] text-foreground font-semibold' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Primary mobile" className="md:hidden border-t px-4 py-2 bg-white">
            {nav.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
                  data-testid={`link-mobile-nav-${label.toLowerCase().replace(' ', '-')}`}
                  className={cn('flex items-center gap-3 px-3 py-3 rounded-xl text-sm', active ? 'bg-secondary font-semibold' : 'hover:bg-secondary')}>
                  <Icon className="w-4 h-4" />{label}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1">{children}</main>
      <footer className="border-t bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row gap-4 justify-between">
          <nav aria-label="Project links" className="flex flex-wrap gap-x-4 gap-y-2 self-start">
            <a href={communityLinks.developerDocs} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-official-portal">Investec developer docs</a>
            <a href={communityLinks.repository} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-repository">Repository</a>
            <a href={communityLinks.contributing} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-contributing">Contribute</a>
            <a href={communityLinks.reportIssue} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-report-issue">Report an issue</a>
            <a href={communityLinks.license} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-license">Licence</a>
            <a href={communityLinks.releases} target="_blank" rel="noopener noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground" data-testid="link-releases">Releases</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
