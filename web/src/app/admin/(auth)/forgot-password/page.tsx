import type { Metadata } from "next";
import { ForgotForm } from "@/components/admin/AuthForms";

export const metadata: Metadata = { title: "Forgot password" };

export default function AdminForgotPasswordPage() {
  return <ForgotForm />;
}
