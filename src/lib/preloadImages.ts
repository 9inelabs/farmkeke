// The bundled photos on the welcome slides, Get started and the farmer sign-up
// introduction, with a blurhash for each, and a warm-up that decodes them at
// launch so those screens show their photos straight away (APK corrections
// #7, 22 Nov 2026).
//
// The files in assets/photos are sized to how they're drawn (about screen
// width x 3 at most; the thumbnail-only farmer-field.jpg is 160 px) and the
// blurhashes were computed from them at build time with sharp. Re-run the
// hashing if a photo is replaced. Credits: src/content/photoCredits.ts.
import { Image, type ImageProps } from "expo-image";

export const PHOTOS = {
  /** Welcome slide 1, full-bleed */
  farmerGreens: require("../../assets/photos/farmer-greens.jpg"),
  /** Welcome farm thumbnails (36 and 46 pt) */
  farmerField: require("../../assets/photos/farmer-field.jpg"),
  /** Welcome slide 2 collage */
  tomatoes: require("../../assets/photos/tomatoes-basket.jpg"),
  fruits: require("../../assets/photos/fruits.jpg"),
  peppers: require("../../assets/photos/peppers-market.jpg"),
  carrots: require("../../assets/photos/carrots-peppers.jpg"),
  /** Get started, top photo */
  marketStall: require("../../assets/photos/market-stall.jpg"),
  /** Farmer sign-up introduction, full-bleed */
  farmerFieldHd: require("../../assets/photos/farmer-field-hd.jpg"),
} as const;

export type PhotoName = keyof typeof PHOTOS;

// Blurhashes of the files above (4x3 components, or 3x4 for portrait photos)
const BLURHASH: Record<PhotoName, string> = {
  farmerGreens: "TUIrA?icw~?1e-ozyEt5x[k?ocs;",
  farmerField: "LOHV3NM_?at5*0M{RkRj_3sCxbkB",
  tomatoes: "LOGkXv%iL4xJyFcGN#oi9wIXaMM}",
  fruits: "LQKT089}0%ouM|r=J8OEM~t2%1Ia",
  peppers: "TVEo3~~n%$NbR%n$9uMyivxGawR-",
  carrots: "LRGRX.J90%,?Gp$z,?E5t2t6WERl",
  marketStall: "L9Dbl+-S0NE*y6xtRpa#ADK4-Bov",
  farmerFieldHd: "TLG[+baw-:yZM{M{_Nw|xax]NHbc",
};

/**
 * The props that make a bundled photo appear at once: the photo itself, its
 * blurhash behind it for the moment it decodes, a short fade, and high
 * priority. Spread onto an expo-image <Image>, then add style and contentFit.
 */
export function photoProps(name: PhotoName) {
  return {
    source: PHOTOS[name],
    placeholder: { blurhash: BLURHASH[name] },
    placeholderContentFit: "cover",
    transition: 120,
    priority: "high",
    cachePolicy: "memory-disk",
  } satisfies Partial<ImageProps>;
}

let started: Promise<void> | null = null;

/**
 * Decodes every photo above once, so the welcome and sign-up screens find them
 * ready. Call at launch (it never throws and only runs once); awaiting it is
 * optional.
 */
export function preloadImages(): Promise<void> {
  started ??= Promise.all(
    Object.values(PHOTOS).map((photo) =>
      Image.loadAsync(photo).then(
        () => undefined,
        () => undefined,
      ),
    ),
  ).then(() => undefined);
  return started;
}
