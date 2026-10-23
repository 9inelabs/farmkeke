/** The phone's own date, "YYYY-MM-DD": what "today" and "Picked today" mean for this shopper. */
export const localDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
