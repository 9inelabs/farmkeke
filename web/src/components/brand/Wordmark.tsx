import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";

// The wordmark is Farmkeke's only logo (no shield or icon mark). Where the
// designs show a mark + wordmark pair, this single wordmark replaces both.
// Source: public/brand/wordmark.png (705 × 135).
const RATIO = 705 / 135;

export function Wordmark({ height = 24, priority = false }: { height?: number; priority?: boolean }) {
  return (
    <Image
      src="/brand/wordmark.png"
      alt="Farmkeke"
      width={Math.round(height * RATIO)}
      height={height}
      priority={priority}
      style={{ height, width: "auto" }}
    />
  );
}

/** Wordmark linking home, as in every header. */
export function HomeLogo({ height = 24, href = routes.home }: { height?: number; href?: string }) {
  return (
    <Link href={href} aria-label="Farmkeke home" className="flex flex-none items-center">
      <Wordmark height={height} priority />
    </Link>
  );
}
