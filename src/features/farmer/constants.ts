import type { Section } from "@convex/lib/application";

export const FARM_SIZES = [
  { value: "under_1", label: "Under 1 hectare" },
  { value: "1_to_5", label: "1–5 hectares" },
  { value: "5_to_20", label: "5–20 hectares" },
  { value: "over_20", label: "Over 20 hectares" },
] as const;

export const FARM_TYPES = [
  { value: "crops", label: "Crops" },
  { value: "livestock", label: "Livestock" },
  { value: "poultry", label: "Poultry" },
  { value: "fish", label: "Fish" },
  { value: "mixed", label: "Mixed" },
] as const;

export const SEASONS = [
  { value: "all_year", label: "All year" },
  { value: "rainy", label: "Rainy season" },
  { value: "dry", label: "Dry season" },
] as const;

export const LEAD_TIMES = [
  { value: 4, label: "Same day", detail: "4 hours" },
  { value: 12, label: "12 hours", detail: "Half a day" },
  { value: 24, label: "24 hours", detail: "Next day" },
  { value: 48, label: "2 days", detail: "48 hours" },
] as const;

export type FarmSize = (typeof FARM_SIZES)[number]["value"];
export type FarmType = (typeof FARM_TYPES)[number]["value"];
export type Season = (typeof SEASONS)[number]["value"];

export const labelOf = <T extends { value: string | number; label: string }>(list: readonly T[], value?: T["value"]) =>
  list.find((x) => x.value === value)?.label ?? "";

/** The application steps (F-03 to F-08) in order; review is step 6. */
export const STEPS: { section: Section | "review"; path: string; title: string }[] = [
  { section: "farm", path: "/sell/apply/farm", title: "Farm details" },
  { section: "produce", path: "/sell/apply/produce", title: "What you grow" },
  { section: "collection", path: "/sell/apply/collection", title: "Collection details" },
  { section: "documents", path: "/sell/apply/documents", title: "Documents" },
  { section: "payout", path: "/sell/apply/payout", title: "Payout details" },
  { section: "review", path: "/sell/apply/review", title: "Review and submit" },
];

/** Where to continue an application: the first step with something missing. */
export function nextStepPath(problems: Partial<Record<Section, string[]>>): string {
  return STEPS.find((s) => s.section !== "review" && (problems[s.section]?.length ?? 0) > 0)?.path ?? STEPS[5].path;
}

export const DOCUMENTS = {
  government_id: { title: "Government ID", detail: "National ID, voter's card, driver's licence or passport" },
  farm_photo: { title: "Farm photos", detail: "At least 3: your fields, crops or animals, and the farm gate" },
  proof_of_address: { title: "Proof of address", detail: "A utility bill or letter showing the farm's address" },
  association_letter: { title: "Farmers association letter", detail: "A letter or card from your farmers association" },
} as const;

export type DocumentKind = keyof typeof DOCUMENTS;
