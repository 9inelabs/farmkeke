// Shared rules for farmer applications (F-03 to F-08). Used by the backend to
// validate a submission and by the app's review screen to list what's missing.
import type { Doc } from "../_generated/dataModel";

export type Section = "farm" | "produce" | "collection" | "documents" | "payout";

export const MIN_FARM_PHOTOS = 3;
export const MAX_FARM_PHOTOS = 10;

type DocCounts = { government_id: number; farm_photo: number; proof_of_address: number; association_letter: number };

/**
 * Plain-words problems per section; an empty object means ready to submit.
 * The short form (24 Oct 2026): the farmer's name, the farm's name and
 * location, a verified phone, and bank details. Produce, collection hours and
 * documents are no longer asked for; the farm sets collection up after
 * approval (F-14). The photo is optional.
 */
export function applicationProblems(
  app: Doc<"farmerApplications">,
  _docs?: DocCounts,
): Partial<Record<Section, string[]>> {
  const problems: Partial<Record<Section, string[]>> = {};
  const add = (section: Section, message: string) => (problems[section] ??= []).push(message);

  if (!app.fullName?.trim()) add("farm", "Add your full name");
  if (!app.farmName?.trim()) add("farm", "Add your farm's name");
  if (!app.phone) add("farm", "Verify your phone number");
  if (!app.state || !app.lga) add("farm", "Choose where your farm is");
  if (!app.address?.trim()) add("farm", "Add the farm's address or a landmark");

  if (!app.bankCode) add("payout", "Choose your bank");
  if (!app.accountNumber || !/^\d{10}$/.test(app.accountNumber)) add("payout", "Add your 10-digit account number");
  if (!app.accountName?.trim()) add("payout", "Add the account name");

  return problems;
}

/** Until the farm confirms its own (F-14 checklist): Monday to Saturday, 8am to 5pm. */
export const DEFAULT_COLLECTION_HOURS = [1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "08:00", closes: "17:00" }));
export const DEFAULT_LEAD_TIME_HOURS = 24;

export const EDITABLE_STATUSES = ["draft", "more_info"] as const;
