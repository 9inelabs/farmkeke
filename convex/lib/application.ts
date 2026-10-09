// Shared rules for farmer applications (F-03 to F-08). Used by the backend to
// validate a submission and by the app's review screen to list what's missing.
import type { Doc } from "../_generated/dataModel";

export type Section = "farm" | "produce" | "collection" | "documents" | "payout";

export const MIN_FARM_PHOTOS = 3;
export const MAX_FARM_PHOTOS = 10;

type DocCounts = { government_id: number; farm_photo: number; proof_of_address: number; association_letter: number };

/** Plain-words problems per section; an empty object means ready to submit. */
export function applicationProblems(
  app: Doc<"farmerApplications">,
  docs: DocCounts,
): Partial<Record<Section, string[]>> {
  const problems: Partial<Record<Section, string[]>> = {};
  const add = (section: Section, message: string) => (problems[section] ??= []).push(message);

  if (!app.farmName?.trim()) add("farm", "Add your farm's name");
  if (!app.phone) add("farm", "Add your phone number");
  if (!app.state || !app.lga) add("farm", "Choose the state and LGA");
  if (!app.address?.trim()) add("farm", "Add the farm's address");
  if (!app.farmSize) add("farm", "Choose the farm size");
  if (!app.farmType) add("farm", "Choose the type of farm");

  if (app.categoryIds.length === 0) add("produce", "Choose at least one category");
  if (!app.mainCrops?.trim()) add("produce", "Tell us your main crops or products");
  if (app.seasons.length === 0) add("produce", "Choose when you sell");

  if (!app.collectionAddress?.trim()) add("collection", "Add the collection address");
  if (app.collectionHours.length === 0) add("collection", "Choose collection days and hours");
  if (app.leadTimeHours === undefined) add("collection", "Choose how long you need to prepare an order");

  if (docs.government_id === 0) add("documents", "Add a photo of your government ID");
  if (docs.farm_photo < MIN_FARM_PHOTOS) add("documents", `Add at least ${MIN_FARM_PHOTOS} farm photos`);
  if (docs.proof_of_address === 0) add("documents", "Add proof of address");
  if (docs.association_letter === 0) add("documents", "Add your farmers association letter");

  if (!app.bankCode) add("payout", "Choose your bank");
  if (!app.accountNumber || !/^\d{10}$/.test(app.accountNumber)) add("payout", "Add your 10-digit account number");
  if (!app.accountName?.trim()) add("payout", "Add the account name");

  return problems;
}

export const EDITABLE_STATUSES = ["draft", "more_info"] as const;
