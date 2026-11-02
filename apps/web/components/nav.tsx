'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/', label: 'Slate' },
  { href: '/data', label: 'Data' },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="fc-tabs" aria-label="Sections">
      {ITEMS.map((i) => (
        <Link key={i.href} className="fc-tab" href={i.href} aria-current={path === i.href ? 'page' : undefined}>{i.label}</Link>
      ))}
    </nav>
  );
}
