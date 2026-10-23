// The QR encoder on its own (no canvas or file output), for PickupQr.
declare module "qrcode/lib/core/qrcode" {
  type Modules = { size: number; get(row: number, col: number): boolean | number };
  const QRCode: { create(text: string, options?: { errorCorrectionLevel?: "L" | "M" | "Q" | "H" }): { modules: Modules } };
  export default QRCode;
}
