'use client';
// Facet dropdown menu (packages/facet/components/app-shell.md, "Scope switcher"): a trigger and a
// .fc-dropdown of menuitemradio rows. Enter, Space or Down opens on the checked item, Up on the last;
// Up/Down move, Home/End jump, a letter jumps by first letter, Escape closes back to the trigger, Tab
// closes (INT-01, INT-03).
import Link from 'next/link';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

export interface DropdownItem {
  value: string;
  label: string;
  detail?: string;
  /** A group heading before this item. */
  group?: string;
  /** Navigates instead of selecting: rendered as a link (INT-27, menu.md MenuLink). */
  href?: string;
}

export function Dropdown({
  label, trigger, triggerClass, items, value, onSelect, align, triggerProps, actions,
}: {
  /** The menu's accessible name. */
  label: string;
  trigger: ReactNode;
  triggerClass: string;
  items: DropdownItem[];
  value?: string | null;
  onSelect: (value: string) => void;
  align?: 'end';
  triggerProps?: Record<string, string | undefined>;
  /** An actions menu (menuitem rows, nothing checked) instead of a choice (menuitemradio). */
  actions?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const rows = () => [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
  const focusAt = (i: number) => { const r = rows(); r[(i + r.length) % r.length]?.focus(); };

  const show = (at: 'checked' | 'last') => {
    setOpen(true);
    requestAnimationFrame(() => {
      const r = rows();
      const checked = r.findIndex((x) => x.getAttribute('aria-checked') === 'true');
      focusAt(at === 'last' ? r.length - 1 : Math.max(0, checked));
    });
  };
  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const r = rows();
    const i = r.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(r.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') setOpen(false);
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase();
      const next = r.findIndex((x, j) => j > i && x.textContent?.toLowerCase().startsWith(k));
      const first = r.findIndex((x) => x.textContent?.toLowerCase().startsWith(k));
      if (next >= 0 || first >= 0) focusAt(next >= 0 ? next : first);
    }
  };

  return (
    <div className="fc-scope" ref={root}>
      <button
        ref={button} type="button" className={triggerClass} aria-haspopup="menu" aria-expanded={open} aria-controls={id} {...triggerProps}
        onClick={() => (open ? close(false) : show('checked'))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); show('checked'); }
          if (e.key === 'ArrowUp') { e.preventDefault(); show('last'); }
        }}
      >
        {trigger}
      </button>
      <div className="fc-dropdown" role="menu" id={id} aria-label={label} hidden={!open} data-align={align} onKeyDown={onMenuKey}>
        {items.map((it) => (
          <div key={it.value} style={{ display: 'contents' }}>
            {it.group && <div className="fc-dropdown-label" role="presentation">{it.group}</div>}
            {it.href ? (
              <Link className="fc-dropdown-item" role="menuitem" tabIndex={-1} href={it.href} onClick={() => close(false)}>
                <span>{it.label}</span>
                {it.detail && <span className="fc-dropdown-item-detail">{it.detail}</span>}
              </Link>
            ) : (
              <button
                type="button" className="fc-dropdown-item" role={actions ? 'menuitem' : 'menuitemradio'} aria-checked={actions ? undefined : value === it.value} tabIndex={-1}
                onClick={() => { onSelect(it.value); close(); }}
              >
                <span>{it.label}</span>
                {it.detail && <span className="fc-dropdown-item-detail">{it.detail}</span>}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
