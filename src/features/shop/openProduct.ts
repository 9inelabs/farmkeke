// Opens a product page, handing it the photo the shopper just tapped so the
// page shows it at once (already in expo-image's cache) while the rest loads,
// instead of a grey block during the scale-in (APK correction #8).
import { router } from "expo-router";

export function openProduct(id: string, imageUrl?: string | null) {
  router.push({ pathname: "/product/[id]", params: imageUrl ? { id, img: imageUrl } : { id } });
}
