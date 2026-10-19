import type { Metadata } from "next";
import { ApplyForm } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Apply for access" };

// A-02 Staff application: details and a password, then the emailed code.
export default function AdminApplyPage() {
  return <ApplyForm />;
}
