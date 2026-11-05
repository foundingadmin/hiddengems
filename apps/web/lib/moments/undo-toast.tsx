'use client';
// The Undo toast on Facet's part (packages/facet/components/toast.md, Undo toast): the change has happened, and
// five dots count its 5 seconds down. The time holds while the toast is hovered or focused (js/undo.mjs).
import { mountUndo } from '@foundingcreative/facet/js/undo.mjs';
import { useEffect, useRef } from 'react';

export function UndoToast({ text, onUndo, onExpire }: { text: string; onUndo: () => void; onExpire: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    if (!ref.current) return;
    const countdown = mountUndo(ref.current, { onExpire: () => expire.current() });
    return () => countdown.destroy();
  }, []);
  return (
    <div className="fc-toast" ref={ref}>
      <span className="fc-toast-text text-copy-14">{text}</span>
      <span className="fc-toast-dots" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      <button type="button" className="fc-button" data-variant="secondary" data-size="small" onClick={onUndo}>Undo</button>
    </div>
  );
}
