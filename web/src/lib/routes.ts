// Every page URL on the website, in one place. Link with these, never with
// hard-coded strings, so the review step can check that every link resolves.

export const routes = {
  // Landing and content (W-00, W-60, W-80 to W-87)
  home: "/",
  sell: "/sell",
  howItWorks: "/how-it-works",
  escrow: "/escrow",
  pickupLocations: "/pickup-locations",
  getTheApp: "/get-the-app",
  about: "/about",
  help: "/help",
  contact: "/contact",
  legal: (doc: LegalDoc = "refunds") => `/legal/${doc}`,

  // Shop (W-01 to W-07)
  shop: "/shop",
  categories: "/shop/categories",
  /** Every product, newest first (Fresh Picks "See all") */
  allProducts: "/shop/all",
  category: (slug: string) => `/shop/category/${slug}`,
  search: (text?: string) => (text ? `/shop/search?q=${encodeURIComponent(text)}` : "/shop/search"),
  product: (id: string) => `/shop/product/${id}`,
  farm: (id: string) => `/shop/farm/${id}`,

  // Cart and checkout (W-20 to W-30)
  cart: "/cart",
  checkout: "/checkout",
  checkoutDelivery: "/checkout/delivery",
  checkoutDetails: "/checkout/details",
  checkoutReview: "/checkout/review",
  pay: (checkoutId: string) => `/checkout/pay/${checkoutId}`,
  /** A delivery bill's pay link: works on any device for whoever has it */
  payBill: (token: string) => `/pay/${token}`,
  orderPlaced: (checkoutId: string) => `/order-placed/${checkoutId}`,

  // Sign in and accounts (W-40 to W-49)
  signIn: (next?: string) => (next ? `/signin?next=${encodeURIComponent(next)}` : "/signin"),
  signUp: (next?: string) => (next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"),
  accountCreated: "/account-created",
  forgotPassword: "/forgot-password",
  checkEmail: "/check-email",
  resetPassword: "/reset-password",
  passwordChanged: "/password-changed",
  linkExpired: "/link-expired",
  account: "/account",
  myOrders: "/account/orders",
  profile: "/account/profile",
  addresses: "/account/addresses",
  saved: "/account/saved",
  notifications: "/account/notifications",
  deleteAccount: "/account/delete",

  // Orders after checkout (W-50 to W-58)
  findOrder: "/find-order",
  order: (orderId: string) => `/orders/${orderId}`,
  orderReleased: (orderId: string) => `/orders/${orderId}/released`,
  reportProblem: (orderId: string) => `/orders/${orderId}/problem`,
  problemReported: (orderId: string) => `/orders/${orderId}/problem/sent`,
  dispute: (orderId: string) => `/orders/${orderId}/dispute`,
  refund: (orderId: string) => `/orders/${orderId}/refund`,
  review: (orderId: string) => `/orders/${orderId}/review`,
  chat: (orderId: string) => `/orders/${orderId}/chat`,

  // System states (W-S1 to W-S6)
  maintenance: "/maintenance",
  sessionExpired: "/session-expired",
} as const;

export type LegalDoc = "refunds" | "terms" | "privacy" | "farmer-terms" | "cookies";
