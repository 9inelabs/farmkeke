// W-42d Password changed
import { Check } from "lucide-react";
import Link from "next/link";
import { AuthCard, authTitle } from "@/components/account/AuthLayouts";
import { ButtonLink } from "@/components/ui/Button";
import { routes } from "@/lib/routes";

export function PasswordChangedView() {
  return (
    <AuthCard top={88} padding="44px 36px" center>
      <span aria-hidden className="inline-flex size-[72px] items-center justify-center rounded-full bg-lime text-forest">
        <Check className="size-[34px]" strokeWidth={2.5} />
      </span>
      <h1 className={`${authTitle} mt-[22px]`}>Your password is changed</h1>
      <p className="p mt-2">Sign in with your new password on the website or in the Farmkeke app.</p>
      <ButtonLink href={routes.signIn()} variant="lime" size="lg" fullWidth className="mt-[26px] min-h-[54px] rounded-[14px]">
        Sign in
      </ButtonLink>
      <p className="mt-[18px] text-[13px] leading-[19px] text-subtle">
        Didn&apos;t change your password?{" "}
        <Link href={routes.contact} className="font-semibold">
          Contact support
        </Link>{" "}
        straight away.
      </p>
    </AuthCard>
  );
}
