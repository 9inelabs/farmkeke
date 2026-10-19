import type { Metadata } from "next";
import { CategoriesView } from "./CategoriesView";

export const metadata: Metadata = { title: "Categories" };
// Behind the staff gate, which only renders on the client (see the layout).
export const instant = false;

// A-80 Categories: names, pictures, order, types (sub-chips) and hiding.
export default function AdminCategoriesPage() {
  return <CategoriesView />;
}
