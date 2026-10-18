// W-42e Link expired: reset links work for 30 minutes and only once.
import { Hourglass } from "lucide-react";
import Link from "next/link";
import { AuthCard, authTitle } from "@/components/account/AuthLayouts";
import { ButtonLink } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

export function LinkExpiredView() {
  return (
    <AuthCard top={88} padding="44px 36px" center>
      <span aria-hidden className="inline-flex size-[72px] items-center justify-center rounded-full bg-pend-bg text-pend">
        <Hourglass className="size-8" strokeWidth={1.75} />
      </span>
      <h1 className={`${authTitle} mt-[22px]`}>This link has expired</h1>
      <p className="p mt-2">Reset links work for 30 minutes and only once. Ask for a new one and use it straight away.</p>
      <ButtonLink href={routes.forgotPassword} variant="lime" size="lg" fullWidth className="mt-[26px] min-h-[54px] rounded-[14px]">
        Send a new link
      </ButtonLink>
      <p className="mt-[18px] text-sm">
        <Link href={routes.signIn()} className="inline-flex min-h-11 items-center font-semibold">
          Back to sign in
        </Link>
      </p>
    </AuthCard>
  );
}
