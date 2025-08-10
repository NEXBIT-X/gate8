"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string): Crumb[] {
  if (!pathname || pathname === '/') return [];
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = '';
  for (let i = 0; i < segments.length; i++) {
    acc += '/' + segments[i];
    const raw = segments[i];
    // Hide raw dynamic ids (uuid-like or numeric) for cleaner UI
    if (/^[0-9a-fA-F-]{8,}$/.test(raw) || /\d{4,}/.test(raw)) {
      crumbs.push({ label: 'Detail', href: acc });
      continue;
    }
    const label = raw
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

export const Breadcrumbs: React.FC<{ className?: string; rootLabel?: string; hideRoot?: boolean; }> = ({ className = '', rootLabel = 'Home', hideRoot }) => {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={`text-xs flex items-center gap-1 text-muted-foreground ${className}`}>
      {!hideRoot && (
        <>
          <Link href="/" className="hover:text-foreground transition-colors">{rootLabel}</Link>
          <span>/</span>
        </>
      )}
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <React.Fragment key={c.href}>
            {!last ? (
              <Link href={c.href} className="hover:text-foreground transition-colors max-w-[12ch] truncate" title={c.label}>{c.label}</Link>
            ) : (
              <span className="text-foreground font-medium max-w-[18ch] truncate" title={c.label}>{c.label}</span>
            )}
            {!last && <span>/</span>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
