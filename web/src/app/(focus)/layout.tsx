// Focused pages that draw their own header (or none): sign in and account
// creation (W-40 to W-42e), payment (W-26 to W-30), and the single-purpose
// order pages (W-52b, W-53b, W-56, W-57, W-58). Use MinimalHeader from
// @/components/layout/SimpleHeaders where the design shows a logo bar.
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
