// The phone and code from the code screen, for the PIN screen to sign in
// with. Kept in memory only, never stored or put in the address.
let pending: { phone: string; code: string } | null = null;

export const pendingCode = {
  get: () => pending,
  set: (value: { phone: string; code: string } | null) => {
    pending = value;
  },
};
