import { ConvexError } from "convex/values";

export function requireText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new ConvexError(`${field} is required`);
  return trimmed;
}

export function requireSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    throw new ConvexError("Use lowercase letters, numbers and dashes only");
  }
  return slug;
}

export function requireKobo(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new ConvexError(`${field} must be a whole, non-negative amount in kobo`);
  }
  return value;
}

export function requireOpeningHours(hours: { day: number; opens: string; closes: string }[]) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const slot of hours) {
    if (!Number.isInteger(slot.day) || slot.day < 0 || slot.day > 6) {
      throw new ConvexError("Day must be 0 (Sunday) to 6 (Saturday)");
    }
    if (!time.test(slot.opens) || !time.test(slot.closes) || slot.opens >= slot.closes) {
      throw new ConvexError("Opening hours must be HH:MM, and close after they open");
    }
  }
  return hours;
}
