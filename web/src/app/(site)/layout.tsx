import { SiteFooter } from "@/components/layout/Footers";
import { SiteHeader } from "@/components/layout/SiteHeader";

// Landing and information pages: Main, W-00, W-60, W-80 to W-87.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
