import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { BookOpen, Compass, LayoutGrid, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { href: '/', label: 'Library', icon: LayoutGrid },
  { href: '/getting-started', label: 'Getting started', icon: Compass },
  { href: '/reference', label: 'API reference', icon: BookOpen },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === '/' ? loc === '/' || loc.startsWith('/kits') : loc.startsWith(href));
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <div className="bg-[#0f172a] text-slate-100 text-xs px-4 py-2 text-center" data-testid="text-disclaimer">
        Community prototype. Not an official Investec site. Mock data only, no bank connection.
      </div>
      <header className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 min-w-0" data-testid="link-home" aria-label="Launchpad home">
            <img src={`${import.meta.env.BASE_URL}brand/launchpad-zebra.png`} width={36} height={36} alt="" aria-hidden="true" className="w-9 h-9 object-contain shrink-0" data-testid="image-header-zebra" />
            <span className="flex flex-col leading-tight min-w-0">
              <span className="font-semibold text-[17px] text-foreground">Launchpad</span>
              <span className="text-xs text-muted-foreground truncate">Community starter kits</span>
            </span>
          </Link>
          <a href="https://developer.investec.com/" target="_blank" rel="noreferrer" className="ml-auto hidden md:flex flex-col items-end gap-1" aria-label="Visit the official Investec Developer portal (opens a new tab)">
            <img src={`${import.meta.env.BASE_URL}brand/investec-developer-logo.png`} alt="Investec Developer" className="w-40 h-auto" />
            <span className="text-[11px] text-muted-foreground">Visit the official portal ↗</span>
          </a>
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
      <main className="flex-1">{children}</main>
      <footer className="border-t bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-muted-foreground flex flex-col md:flex-row gap-4 justify-between">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-start gap-3">
              <img src={`${import.meta.env.BASE_URL}brand/launchpad-zebra.png`} width={28} height={28} alt="" aria-hidden="true" className="w-7 h-7 object-contain shrink-0" data-testid="image-footer-zebra" />
              <p className="text-foreground font-medium">Launchpad, an independent community prototype for SA programmable-banking builders.</p>
            </div>
            <p className="text-xs">Not affiliated with, endorsed by or operated by Investec. Visual styling references the public Investec Developer portal; any Investec marks belong to their owner. Checklist progress lives in this browser only.</p>
          </div>
          <a href="https://developer.investec.com/" target="_blank" rel="noreferrer" className="text-sm underline underline-offset-4 hover:text-foreground self-start" data-testid="link-official-portal">Official Investec Developer portal</a>
        </div>
      </footer>
    </div>
  );
}

export function MockBadge({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium border border-amber-300 bg-amber-50 text-amber-900 px-2 py-0.5 rounded-full', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" aria-hidden="true" /> Mock only
    </span>
  );
}
