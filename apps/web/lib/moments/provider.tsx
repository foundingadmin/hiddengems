'use client';
// Moments (packages/facet/patterns/moments.md): one provider in the Shell owns the shared viewport stage, the
// Undo toast and a polite live region. Scenes live one file per moment beside this one, and each surface imports
// its own scene, so a new moment adds a file and edits nothing shared.
import { type Stage, createStage } from '@foundingcreative/facet/js/dots.mjs';
import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { UndoToast } from './undo-toast';

export type UndoResult = 'undone' | 'expired';

export interface Moments {
  /** The shared full-viewport stage, created on first use and removed with the Shell. */
  stage(): Stage;
  /** Shows the Undo toast. Resolves 'undone' when Undo is pressed, 'expired' after 5 seconds or when another
   *  Undo replaces it. The change itself has already happened (state first). */
  undo(text: string): Promise<UndoResult>;
  /** Says a change in the polite live region, for changes the screen shows without words. */
  announce(text: string): void;
}

const MomentsContext = createContext<Moments | null>(null);

export function useMoments(): Moments {
  const m = useContext(MomentsContext);
  if (!m) throw new Error('useMoments needs the MomentsProvider (mounted by the Shell)');
  return m;
}

interface Pending { id: number; text: string; settle: (r: UndoResult) => void }

export function MomentsProvider({ children }: { children: ReactNode }) {
  const stageRef = useRef<Stage | null>(null);
  const [toast, setToast] = useState<Pending | null>(null);
  const [said, setSaid] = useState('');
  const ids = useRef(0);

  useEffect(() => () => { stageRef.current?.destroy(); stageRef.current = null; }, []);

  const finish = useCallback((id: number, r: UndoResult) => {
    setToast((t) => {
      if (t?.id !== id) return t;
      t.settle(r);
      return null;
    });
  }, []);

  const moments = useMemo<Moments>(() => ({
    stage: () => (stageRef.current ??= createStage()),
    undo: (text) => new Promise<UndoResult>((settle) => {
      const id = ++ids.current;
      setToast((t) => {
        t?.settle('expired');
        return { id, text, settle };
      });
    }),
    announce: (text) => {
      // Clearing first makes a repeated message speak again.
      setSaid('');
      requestAnimationFrame(() => setSaid(text));
    },
  }), []);

  return (
    <MomentsContext.Provider value={moments}>
      {children}
      <div className="fc-toast-region" role="status">
        {toast && (
          <UndoToast key={toast.id} text={toast.text}
            onUndo={() => finish(toast.id, 'undone')} onExpire={() => finish(toast.id, 'expired')} />
        )}
      </div>
      <p className="fc-visually-hidden" role="status">{said}</p>
    </MomentsContext.Provider>
  );
}
