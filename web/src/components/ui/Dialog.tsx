"use client";

// Modal (centred) and Drawer (side panel; bottom sheet on phones), used by the
// mini-cart (W-08), area picker (W-09), filters (W-05), address form (W-46b),
// confirm receipt (W-52), cookie settings (W-88) and others.
// Accessible: role="dialog", aria-modal, labelled by its title, Escape closes,
// focus moves in and is trapped, focus returns to the opener, page scroll locks.
// Motion: opacity + transform only, 250ms in; drawers 300ms.
import { X } from "lucide-react";
import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, transition } from "@/lib/motion";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Shown under the title */
  description?: ReactNode;
  children: ReactNode;
  /** Sticky footer (buttons) */
  footer?: ReactNode;
  /** Hide the visible title (still read by screen readers) */
  hideTitle?: boolean;
  /** Max width in px (modal) or width (drawer). */
  width?: number;
  className?: string;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useDialogBehaviour(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const focusFirst = () => {
      const el = panel.current;
      if (!el) return;
      const target = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>(FOCUSABLE) ?? el;
      target.focus();
    };
    const raf = requestAnimationFrame(focusFirst);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panel.current) {
        const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open]);

  return panel;
}

function Header({
  titleId,
  descId,
  title,
  description,
  hideTitle,
  onClose,
}: {
  titleId: string;
  descId: string;
  title: ReactNode;
  description?: ReactNode;
  hideTitle?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 m:px-4">
      <div className={hideTitle ? "sr-only" : "min-w-0"}>
        <h2 id={titleId} className="h2 text-[22px] leading-7">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="sm mt-1">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="-mr-2 inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-ink hover:bg-canvas"
      >
        <X aria-hidden className="size-[18px]" />
        Close
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, hideTitle, width = 520, className }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useDialogBehaviour(open, onClose);
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 m:items-end m:p-0">
          <m.div
            className="absolute inset-0 bg-[rgba(20,28,16,0.45)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.base}
            onClick={onClose}
            aria-hidden
          />
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={`relative flex max-h-[calc(100dvh-32px)] w-full flex-col overflow-hidden rounded-[22px] bg-surface shadow-[0_24px_60px_rgba(20,28,16,0.22)] outline-none m:max-h-[92dvh] m:rounded-b-none ${className ?? ""}`}
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={transition.base}
          >
            <Header titleId={titleId} descId={descId} title={title} description={description} hideTitle={hideTitle} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 m:px-4">{children}</div>
            {footer ? <div className="border-t border-line-soft px-6 py-4 m:px-4">{footer}</div> : null}
          </m.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, description, children, footer, hideTitle, width = 440, className }: DialogProps) {
  const titleId = useId();
  const descId = useId();
  const panel = useDialogBehaviour(open, onClose);
  const mounted = useMounted();
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50">
          <m.div
            className="absolute inset-0 bg-[rgba(20,28,16,0.45)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition.base}
            onClick={onClose}
            aria-hidden
          />
          {/* Desktop: slides in from the right. Phone: rises as a bottom sheet. */}
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={`fk-drawer absolute top-0 right-0 flex h-full w-full flex-col bg-surface shadow-[-12px_0_40px_rgba(20,28,16,0.18)] outline-none m:top-auto m:bottom-0 m:h-auto m:max-h-[90dvh] m:rounded-t-[22px] ${className ?? ""}`}
            style={{ maxWidth: width }}
            variants={{
              hidden: { opacity: 0.6, x: "100%", y: 0 },
              hiddenSheet: { opacity: 0.6, x: 0, y: "100%" },
              shown: { opacity: 1, x: 0, y: 0 },
            }}
            initial={isPhone() ? "hiddenSheet" : "hidden"}
            animate="shown"
            exit={isPhone() ? "hiddenSheet" : "hidden"}
            transition={{ duration: 0.3, ease: transition.base.ease }}
          >
            <Header titleId={titleId} descId={descId} title={title} description={description} hideTitle={hideTitle} onClose={onClose} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 m:px-4">{children}</div>
            {footer ? <div className="border-t border-line-soft px-6 py-4 m:px-4">{footer}</div> : null}
          </m.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

const noop = () => () => {};
/** True only in the browser after hydration, so portals never mismatch server HTML. */
function useMounted() {
  return useSyncExternalStore(noop, () => true, () => false);
}

function isPhone() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
}
