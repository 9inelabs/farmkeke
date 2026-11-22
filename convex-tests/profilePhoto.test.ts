// APK #10: a shopper sets, replaces and removes a profile photo from Edit
// profile. Old files are deleted; guests and non-photos are refused; the
// farm sees the shopper's photo in its chats.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { paidOrder } from "./orderFlow";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.AUTH_RESEND_KEY;
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const hours = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, opens: "07:00", closes: "19:00" }));
type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });
const page = { cursor: null, numItems: 50 };

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      if (typeof fields.staffRole === "string") await grantStaff(ctx, { id, sessionId }, fields.staffRole);
      return { id, sessionId };
    };
    const admin = await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" });
    const guest = await user({ isAnonymous: true });
    const account = await user({ name: "Ada Obi", email: "ada@example.com" });
    const other = await user({ name: "Bayo", email: "bayo@example.com" });
    const farmerA = await user({ name: "Farmer A", email: "a@example.com", phone: "+2348030000001" });
    const unitId = await ctx.db.insert("units", { slug: "basket", singular: "basket", plural: "baskets", sortOrder: 1, retired: false });
    const areaId = await ctx.db.insert("serviceAreas", { state: "Imo", name: "New Owerri", lga: "Owerri North", deliveryFeeKobo: 100000, active: true, sortOrder: 1 });
    const pointId = await ctx.db.insert("pickupPoints", { name: "Point", address: "Douglas Rd", state: "Imo", lga: "Owerri Municipal", latitude: 5.48, longitude: 7.03, hours, phone: "+2348035550144", collectWithinDays: 2, active: true });
    const appId = await ctx.db.insert("farmerApplications", { userId: farmerA.id, status: "approved", categoryIds: [], seasons: [], collectionHours: [] } as any);
    const farmA = await ctx.db.insert("farms", {
      userId: farmerA.id, applicationId: appId, name: "Ada Greens", phone: "+2348030000009", state: "Imo", lga: "Owerri North", address: "x",
      farmSize: "1_to_5", farmType: "crops", categoryIds: [], collectionAddress: "x", collectionHours: hours, leadTimeHours: 4,
      openDays: [0, 1, 2, 3, 4, 5, 6], holidayMode: false, bankCode: "058", bankName: "GTBank", accountNumber: "0123456789",
      accountName: "Ada Greens", status: "active", trusted: true,
    });
    const tomatoes = await ctx.db.insert("listings", { farmId: farmA, status: "live", name: "Tomatoes", photoIds: [], units: [{ unitId, priceKobo: 450000, stock: 50, minOrder: 1 }], delivery: true, pickup: true, liveAt: Date.now() });
    return { admin, guest, account, other, farmerA, unitId, areaId, pointId, farmA, tomatoes };
  });
}

// convex-test doesn't record a stored file's type (real uploads do), so set it here
const store = (t: T, type = "image/jpeg", body: BlobPart = "photo") =>
  t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([body], { type }));
    await (ctx.db as any).patch(id, { contentType: type });
    return id;
  });
const exists = (t: T, id: any) => t.run(async (ctx) => (await ctx.db.system.get("_storage", id)) !== null);

test("set, replace and remove a profile photo; old files are deleted", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const ada = as(t, s.account);

  const before = await ada.query(api.users.viewer, {});
  expect(before).toMatchObject({ photoUrl: null });
  expect(typeof before?.memberSince).toBe("number");

  expect(typeof (await ada.mutation(api.profilePhoto.generateUploadUrl, {}))).toBe("string");
  const first = await store(t);
  await ada.mutation(api.profilePhoto.set, { storageId: first });
  expect((await ada.query(api.users.viewer, {}))?.photoUrl).toEqual(expect.any(String));

  // Replacing it deletes the first file
  const second = await store(t, "image/png");
  await ada.mutation(api.profilePhoto.set, { storageId: second });
  expect(await exists(t, first)).toBe(false);
  expect(await exists(t, second)).toBe(true);
  expect(await t.run(async (ctx) => (await ctx.db.get("users", s.account.id))?.photoStorageId)).toBe(second);

  // Setting the same one again is a no-op
  await ada.mutation(api.profilePhoto.set, { storageId: second });
  expect(await exists(t, second)).toBe(true);

  // Removing goes back to initials and deletes the file
  await ada.mutation(api.profilePhoto.remove, {});
  expect((await ada.query(api.users.viewer, {}))?.photoUrl).toBeNull();
  expect(await exists(t, second)).toBe(false);
  // Removing again is harmless
  await ada.mutation(api.profilePhoto.remove, {});
});

test("only photos, only accounts, only fresh uploads", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const ada = as(t, s.account);

  // Not a photo: refused (the mutation fails, so nothing is saved)
  const pdf = await store(t, "application/pdf");
  await expect(ada.mutation(api.profilePhoto.set, { storageId: pdf })).rejects.toThrow(/UPLOAD_NOT_IMAGE/);
  const svg = await store(t, "image/svg+xml");
  await expect(ada.mutation(api.profilePhoto.set, { storageId: svg })).rejects.toThrow(/UPLOAD_NOT_IMAGE/);

  // Over 10 MB: refused
  const huge = await store(t, "image/jpeg", new Uint8Array(10 * 1024 * 1024 + 1));
  await expect(ada.mutation(api.profilePhoto.set, { storageId: huge })).rejects.toThrow(/UPLOAD_TOO_LARGE/);

  // Guests and signed-out callers can't have a photo or get upload links
  const guest = as(t, s.guest);
  const photo = await store(t);
  await expect(guest.mutation(api.profilePhoto.generateUploadUrl, {})).rejects.toThrow(/ACCOUNT_REQUIRED/);
  await expect(guest.mutation(api.profilePhoto.set, { storageId: photo })).rejects.toThrow(/ACCOUNT_REQUIRED/);
  await expect(t.mutation(api.profilePhoto.set, { storageId: photo })).rejects.toThrow(/NOT_SIGNED_IN/);
  await expect(t.mutation(api.profilePhoto.remove, {})).rejects.toThrow(/NOT_SIGNED_IN/);
  expect(await exists(t, photo)).toBe(true);

  // An old file (not just uploaded) can't be claimed as a profile photo
  vi.advanceTimersByTime(2 * 60 * 60_000);
  await expect(ada.mutation(api.profilePhoto.set, { storageId: photo })).rejects.toThrow(/UPLOAD_MISSING/);
  expect(await exists(t, photo)).toBe(true);

  // Removing your photo never touches anyone else's
  const bayo = as(t, s.other);
  const bayoPhoto = await store(t);
  await bayo.mutation(api.profilePhoto.set, { storageId: bayoPhoto });
  await ada.mutation(api.profilePhoto.remove, {});
  expect(await exists(t, bayoPhoto)).toBe(true);
});

test("upload links are limited per hour", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const ada = as(t, s.account);
  for (let i = 0; i < 20; i++) await ada.mutation(api.profilePhoto.generateUploadUrl, {});
  await expect(ada.mutation(api.profilePhoto.generateUploadUrl, {})).rejects.toThrow(/RATE_LIMITED/);
});

test("the farm sees the shopper's photo in its chats", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const orderId = await paidOrder(t, s, s.account, "pickup");
  const ada = as(t, s.account);
  const farmer = as(t, s.farmerA);
  await ada.mutation(api.chat.send, { orderId, body: "Are these fresh?", photoIds: [] });

  expect((await farmer.query(api.chat.thread, { orderId }))?.counterpart.photoUrl).toBeNull();
  expect((await farmer.query(api.chat.listForFarm, { paginationOpts: page })).page[0]?.photoUrl).toBeNull();

  await ada.mutation(api.profilePhoto.set, { storageId: await store(t) });
  expect((await farmer.query(api.chat.thread, { orderId }))?.counterpart.photoUrl).toEqual(expect.any(String));
  expect((await farmer.query(api.chat.listForFarm, { paginationOpts: page })).page[0]?.photoUrl).toEqual(expect.any(String));
  // The shopper still sees the farm (no farm photo here), not their own photo
  expect((await ada.query(api.chat.listMine, { paginationOpts: page })).page[0]?.photoUrl).toBeNull();
});
