import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

// The wordmark is Farmkeke's only logo (no shield or icon mark). Where the
// designs show a mark + wordmark pair, this single wordmark replaces both.
// Source: public/brand/wordmark.png (705 × 135). wordmark-light.png is the
// same file with "keke" in white, for the dark headers and footers.
const RATIO = 705 / 135;

type Tone = "dark" | "light";

export function Wordmark({ height = 24, priority = false, tone = "dark" }: { height?: number; priority?: boolean; tone?: Tone }) {
  return (
    <Image
      src={tone === "light" ? "/brand/wordmark-light.png" : "/brand/wordmark.png"}
      alt="Farmkeke"
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      style={{ height, width: "auto" }}
    />
  );
}

/** Wordmark linking home, as in every header. */
export function HomeLogo({ height = 24, href = routes.home, tone = "dark" }: { height?: number; href?: string; tone?: Tone }) {
  return (
    <Link href={href} aria-label="Farmkeke home" className="flex flex-none items-center">
      <Wordmark height={height} priority tone={tone} />
    </Link>
  );
}
