// Renders the legal documents in ./*.json. Text uses two marks only:
// **bold** and [label](href). The same files make the review PDF
// (scripts/legal-pdf.py), so the site and the PDF always match.
import Link from "next/link";
import type { ReactNode } from "react";

export type Block = { p: string } | { ul: string[] };
export type LegalSection = { id: string; title: string; blocks: Block[] };
export type LegalContent = {
  title: string;
  nav: string;
  description: string;
  /** true until the owners approve the wording; the page then shows a draft notice */
  draft: boolean;
  /** "21 October 2026" */
  updated: string;
  short: string;
  sections: LegalSection[];
};

const MARK = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;

export function inline(text: string): ReactNode[] {
  return text.split(MARK).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      return href.startsWith("/") ? (
        <Link key={i} href={href} className="font-semibold">
          {label}
        </Link>
      ) : (
        <a key={i} href={href} className="font-semibold">
          {label}
        </a>
      );
    }
    return part;
  });
}

const text = "text-[15px] leading-[26px] text-ink-3 m:text-sm m:leading-[22px]";

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        "p" in b ? (
          <p key={i} className={`m-0 mt-2.5 m:mt-2 ${text}`}>
            {inline(b.p)}
          </p>
        ) : (
          <ul key={i} className={`m-0 mt-2.5 list-disc pl-5 m:mt-2 ${text}`}>
            {b.ul.map((item, j) => (
              <li key={j} className="mt-1 first:mt-0">
                {inline(item)}
              </li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
