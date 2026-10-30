// The legal documents, copied from the website by scripts/sync-legal.mjs so the
// app and farmkeke.com always show the same wording. Edit the website's copy
// (web/src/content/legal/), then run the script; never edit these files.
import acceptableUse from "./acceptable-use.json";
import cookies from "./cookies.json";
import delivery from "./delivery.json";
import farmerTerms from "./farmer-terms.json";
import privacy from "./privacy.json";
import refunds from "./refunds.json";
import terms from "./terms.json";

export type LegalBlock = { p: string } | { ul: string[] };
export type LegalContent = {
  title: string;
  nav: string;
  description: string;
  draft: boolean;
  /** "21 October 2026" */
  updated: string;
  short: string;
  sections: Array<{ id: string; title: string; blocks: LegalBlock[] }>;
};

export const LEGAL = {
  terms,
  privacy,
  refunds,
  delivery,
  "acceptable-use": acceptableUse,
  "farmer-terms": farmerTerms,
  cookies,
} satisfies Record<string, LegalContent>;

export type LegalDoc = keyof typeof LEGAL;

export function isLegalDoc(doc: string | undefined): doc is LegalDoc {
  return doc !== undefined && Object.hasOwn(LEGAL, doc);
}
