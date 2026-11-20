// Types for js/undo.mjs, the Undo toast countdown (components/toast.md).

export interface UndoCountdown {
  /** Holds the countdown, as hover and focus do. */
  pause(): void;
  /** Releases one pause. */
  resume(): void;
  /** Stops the countdown without calling onExpire. */
  destroy(): void;
}

/** Counts an Undo toast down through its .fc-toast-dots, holding while hovered or focused. */
export declare function mountUndo(toast: HTMLElement, opts?: { duration?: number; onExpire?: () => void }): UndoCountdown;
