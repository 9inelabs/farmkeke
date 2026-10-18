// W-85 Help and FAQ
import type { Metadata } from "next";
import { HelpCenter } from "@/components/site/HelpCenter";
import { FadeUp } from "@/lib/motion";

export const metadata: Metadata = {
  title: "Help and FAQ",
  description:
    "Answers about ordering, payment protection, delivery and pickup, problems and refunds, your account and selling on Farmkeke.",
};

export default function HelpPage() {
  return (
    <div className="wrap-site pt-14">
      <FadeUp>
        <HelpCenter />
      </FadeUp>
    </div>
  );
}
