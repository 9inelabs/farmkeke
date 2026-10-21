"use client";

// W-87 Print button and the "On this page" list that follows your scroll.
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn sm ghost flex-none px-4 m:hidden print:hidden">
      <Printer aria-hidden size={16} strokeWidth={2} />
      Print
    </button>
  );
}

export function OnThisPage({ sections }: { sections: Array<{ id: string; title: string }> }) {
  const [active, setActive] = useState(sections[0]?.id);

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter((el): el is HTMLElement => !!el);
    const observer = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id);
      },
      { rootMargin: "0px 0px -65% 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page">
      <div className="mb-2.5 text-xs leading-4 font-semibold text-ink-3">On this page</div>
      <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={on ? "location" : undefined}
                className={`block py-1 pl-3 text-[13px] ${
                  on
                    ? "font-semibold text-forest shadow-[inset_2px_0_0_var(--color-lime)]"
                    : "text-muted shadow-[inset_2px_0_0_var(--color-line)] hover:text-ink"
                }`}
              >
                {s.title}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
