// Whether a Paystack page is open in the app right now. While it is, the
// link Paystack's return page opens (farmkeke://checkout/pay/<id>?reference=…
// or farmkeke://pay/<token>?reference=…) is the in-app browser's answer, not
// somewhere to go: app/+native-intent.tsx drops it so the pay screen isn't
// opened a second time on top of itself (Android sends the link to the app
// as well as to the browser session).
let session = 0;
let open = false;

export const paySession = {
  get open() {
    return open;
  },
  /**
   * Marks a payment open; the returned function marks it over a moment later,
   * so a return link still on its way when the browser closes is dropped too.
   */
  begin() {
    const mine = ++session;
    open = true;
    return () => {
      setTimeout(() => {
        if (session === mine) open = false;
      }, 2000);
    };
  },
};

const RETURN_LINK = /(?:^|\/)(?:checkout\/)?pay\/[^/?#]+\?(?:.*&)?(?:reference|trxref)=/;

/** A Paystack return link into the app. */
export const isPayReturn = (path: string) => RETURN_LINK.test(path);
