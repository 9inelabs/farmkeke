// Photo credits: photos on the website used under Creative Commons licences,
// which ask for the photographer and licence to be named. Linked from the footer.
import { Camera } from "lucide-react";
import type { Metadata } from "next";
import { Eyebrow, S } from "@/components/site/ui";
import { FadeUp } from "@/lib/motion";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Credits for the photos used on farmkeke.com.",
};

const LICENCE = { label: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };

const CREDITS = [
  {
    title: "A scene from a Nigerian market",
    where: "About page",
    author: "Biggiepopa",
    url: "https://commons.wikimedia.org/wiki/File:A_scene_from_a_nigerian_market.jpg",
  },
  {
    title: "A woman arranging vegetable (Amaranthus caudatus)",
    where: "About page",
    author: "Anniwinner",
    url: "https://commons.wikimedia.org/wiki/File:A_woman_arranging_vegetable_(Amaranthus_caudatus).jpg",
  },
];

export default function CreditsPage() {
  return (
    <div className="wrap-site pt-14 pb-20 m:pt-8 m:pb-12">
      <FadeUp>
        <div className="max-w-[680px]">
          <Eyebrow icon={Camera}>Credits</Eyebrow>
          <h1 className={`${S.h1} mt-4`}>Photo credits</h1>
          <p className="m-0 mt-3 text-base leading-[26px] text-muted m:text-sm m:leading-[22px]">
            Some photos on farmkeke.com are shared by their photographers under Creative Commons licences. Thank you to them.
          </p>
          <ul className="m-0 mt-8 flex list-none flex-col gap-3 p-0">
            {CREDITS.map((c) => (
              <li key={c.url} className="rounded-[18px] bg-surface p-5 shadow-[inset_0_0_0_1px_var(--color-line)] m:p-4">
                <a href={c.url} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-ink hover:text-forest">
                  {c.title}
                </a>
                <p className="m-0 mt-1 text-sm leading-[22px] text-muted">
                  By {c.author}, via Wikimedia Commons, licensed{" "}
                  <a href={LICENCE.url} target="_blank" rel="noreferrer" className="font-semibold">
                    {LICENCE.label}
                  </a>
                  . Used on the {c.where}, cropped.
                </p>
              </li>
            ))}
          </ul>
        </div>
      </FadeUp>
    </div>
  );
}
