"use client";

// FAQ accordion (landing FAQ, W-85 Help). The answer appears at once (no
// height animation, so nothing below jumps around slowly); its text fades and
// rises in (opacity + transform, 250ms) and the chevron rotates (150ms).
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { m, transition } from "@/lib/motion";

export type AccordionItem = { id?: string; question: ReactNode; answer: ReactNode };

export function Accordion({
  items,
  defaultOpen = 0,
  allowMultiple = false,
  className,
}: {
  items: AccordionItem[];
  /** Index open at first; -1 for none */
  defaultOpen?: number;
  allowMultiple?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState<number[]>(defaultOpen >= 0 ? [defaultOpen] : []);
  const base = useId();
  const toggle = (i: number) =>
    setOpen((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : allowMultiple ? [...cur, i] : [i]));

  return (
    <div className={`card overflow-hidden ${className ?? ""}`}>
      {items.map((item, i) => {
        const isOpen = open.includes(i);
        const btnId = `${base}-q${i}`;
        const panelId = `${base}-a${i}`;
        return (
          <div key={item.id ?? i} id={item.id} className={i > 0 ? "shadow-[inset_0_1px_0_var(--color-line)]" : ""}>
            <h3 className="m-0">
              <button
                id={btnId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(i)}
                className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 bg-transparent px-6 py-5 text-left font-display text-base font-bold text-ink m:px-4"
              >
                <span>{item.question}</span>
                <m.span
                  aria-hidden
                  className="flex size-8 flex-none items-center justify-center rounded-full bg-tint text-forest"
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={transition.fast}
                >
                  <ChevronDown className="size-[18px]" />
                </m.span>
              </button>
            </h3>
            <div id={panelId} role="region" aria-labelledby={btnId} hidden={!isOpen}>
              {isOpen ? (
                <m.div
                  className="px-6 pb-6 text-[15px] leading-6 text-muted m:px-4"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={transition.base}
                >
                  {item.answer}
                </m.div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
