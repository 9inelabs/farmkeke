// TEMPORARY foundation check page. OWNER: landing agent replaces this with W-00.
import { ButtonLink } from "@/components/ui/Button";
import { FadeUp } from "@/lib/motion";
import { routes } from "@/lib/routes";

export default function Home() {
  return (
    <div className="wrap-site py-24">
      <FadeUp>
        <h1 className="h1">Farmkeke</h1>
        <p className="p mt-3">From the farm directly to your home.</p>
        <div className="mt-6 flex gap-3">
          <ButtonLink href={routes.shop}>Shop on the web</ButtonLink>
          <ButtonLink href={routes.getTheApp} variant="ghost">
            Get the app
          </ButtonLink>
        </div>
      </FadeUp>
    </div>
  );
}
