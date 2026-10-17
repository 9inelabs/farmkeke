import { CheckoutHeader } from "@/components/layout/SimpleHeaders";

// Checkout steps (W-21 to W-25).
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CheckoutHeader />
      <main id="main" tabIndex={-1} className="pb-24 outline-none">
        {children}
      </main>
    </>
  );
}
