// Sample rows for the browser preview pages (/dev/home-preview, /dev/platforms).
import type { HomeSection } from "./HomeView";

const p = (id: string, name: string, naira: number, unit: string, left?: number) => ({ id, name, priceKobo: naira * 100, unit, imageUrl: null, ...(left ? { left } : {}) });

export const SAMPLE_SECTIONS: HomeSection[] = [
  { key: "fresh", title: "Fresh Picks", seeAll: true, items: [p("1", "Fresh tomatoes", 4500, "basket"), p("2", "Yam tubers", 5500, "tuber"), p("3", "Oshombo Pepper", 6000, "basket")] },
  { key: "near", title: "Near You", seeAll: false, items: [p("4", "Ugwu leaves", 1200, "bunch"), p("5", "Plantain", 3500, "bunch"), p("6", "Garden eggs", 2000, "basket")] },
  { key: "almost_gone", title: "Almost Gone", seeAll: false, items: [p("7", "Palm oil (5 L)", 9500, "keg", 1), p("8", "Brown eggs", 4200, "crate", 2), p("9", "Ofada rice", 8000, "bag", 3)] },
  { key: "best_sellers", title: "Best Sellers This Week", seeAll: false, items: [p("10", "Cassava", 2500, "basket"), p("11", "Scotch bonnet", 3000, "basket"), p("12", "Okra", 1800, "basket")] },
  { key: "top_rated", title: "Top-Rated Farms", seeAll: false, items: [p("13", "Catfish", 7000, "kg"), p("14", "Sweet potatoes", 2800, "basket"), p("15", "Pineapple", 1500, "piece")] },
  { key: "great_value", title: "Great Value", seeAll: false, items: [p("16", "Onions", 2200, "basket"), p("17", "Carrots", 1600, "basket"), p("18", "Cabbage", 900, "head")] },
];
