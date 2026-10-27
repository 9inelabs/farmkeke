// Shared rules for farmer applications (F-03 to F-08). Used by the backend to
// validate a submission and by the app's review screen to list what's missing.
import type { Doc } from "../_generated/dataModel";

export type Section = "farm" | "produce" | "collection" | "documents" | "payout";

export const MIN_FARM_PHOTOS = 3;

/** A National Identification Number: 11 digits. */
export const isNin = (value: string) => /^\d{11}$/.test(value);
export const MAX_FARM_PHOTOS = 10;

type DocCounts = { government_id: number; farm_photo: number; proof_of_address: number; association_letter: number };

/** How many of each document an application has, leaving out rejected and expired ones. */
export function countDocuments(docs: Doc<"farmerDocuments">[]): DocCounts {
  const live = docs.filter((d) => d.status !== "rejected" && d.status !== "expired");
  const count = (kind: Doc<"farmerDocuments">["kind"]) => live.filter((d) => d.kind === kind).length;
  return {
    government_id: count("government_id"),
    farm_photo: count("farm_photo"),
    proof_of_address: count("proof_of_address"),
    association_letter: count("association_letter"),
  };
}

/**
 * Plain-words problems per section; an empty object means ready to submit.
 * The short form (24 Oct 2026): the farmer's name, the farm's name and
 * location, a verified phone, and bank details. Since 27 Oct 2026 (KYC) also
 * the farmer's NIN and at least 3 farm photos. Produce and collection hours
 * are not asked for; the farm sets collection up after approval (F-14). The
 * profile photo is optional.
 */
export function applicationProblems(
  app: Doc<"farmerApplications">,
  docs?: DocCounts,
): Partial<Record<Section, string[]>> {
  const problems: Partial<Record<Section, string[]>> = {};
  const add = (section: Section, message: string) => (problems[section] ??= []).push(message);

  if (!app.fullName?.trim()) add("farm", "Add your full name");
  if (!app.farmName?.trim()) add("farm", "Add your farm's name");
  if (!app.phone) add("farm", "Verify your phone number");
  if (!app.state || !app.lga) add("farm", "Choose where your farm is");
  if (!app.address?.trim()) add("farm", "Add the farm's address or a landmark");
  if (!app.nin || !isNin(app.nin)) add("farm", "Add your 11-digit NIN");

  const photos = docs?.farm_photo ?? 0;
  if (photos < MIN_FARM_PHOTOS) {
    add("documents", photos === 0 ? `Add at least ${MIN_FARM_PHOTOS} photos of your farm` : `Add ${MIN_FARM_PHOTOS - photos} more ${MIN_FARM_PHOTOS - photos === 1 ? "photo" : "photos"} of your farm`);
  }

  if (!app.bankCode) add("payout", "Choose your bank");
  if (!app.accountNumber || !/^\d{10}$/.test(app.accountNumber)) add("payout", "Add your 10-digit account number");
  if (!app.accountName?.trim()) add("payout", "Add the account name");

  return problems;
}

/** Until the farm confirms its own (F-14 checklist): Monday to Saturday, 8am to 5pm. */
export const DEFAULT_COLLECTION_HOURS = [1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "17:00" }));
export const DEFAULT_LEAD_TIME_HOURS = 24;

export const EDITABLE_STATUSES = ["draft", "more_info"] as const;
