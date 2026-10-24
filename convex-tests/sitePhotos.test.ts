// A-87 Site photos: staff upload, replace and remove the sign-in and sign-up
// panel photos; the website reads them through sitePhotos.auth.
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function seed(t: T) {
  await t.mutation(internal.admin.setup.ensureRoles, {});
  return await t.run(async (ctx) => {
    const user = async (name: string, email: string) => {
      const id = await ctx.db.insert("users", { name, email } as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      return { id, sessionId };
    };
    const catalog = await user("Chika Catalog", "chika@farmkeke.com");
    await grantStaff(ctx, catalog, "catalog");
    const finance = await user("Funmi Finance", "funmi@farmkeke.com");
    await grantStaff(ctx, finance, "finance");
    const shopper = await user("Ada Obi", "ada@example.com");
    return { catalog, finance, shopper };
  });
}

// convex-test doesn't record a stored file's type (real uploads do), so set it here
const store = async (t: T, type = "image/jpeg") =>
  await t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob(["photo"], { type }));
    await (ctx.db as any).patch(id, { contentType: type });
    return id;
  });
const exists = (t: T, id: any) => t.run(async (ctx) => (await ctx.db.system.get("_storage", id)) !== null);

test("staff set, replace and remove the sign-in photo; the website sees each change", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const staff = as(t, s.catalog);

  expect(await t.query(api.sitePhotos.auth, {})).toEqual({ signin: null, signup: null });

  const first = await store(t);
  await staff.mutation(api.admin.sitePhotos.set, { slot: "signin", storageId: first, focus: "center", reason: "Harvest season photo" });
  const shown = await t.query(api.sitePhotos.auth, {});
  expect(shown.signin?.focus).toBe("center");
  expect(shown.signin?.url).toEqual(expect.any(String));
  expect(shown.signup).toBeNull();

  // Changing only the focus keeps the photo
  await staff.mutation(api.admin.sitePhotos.set, { slot: "signin", focus: "left", reason: "Keep the farmer in view" });
  expect((await t.query(api.sitePhotos.auth, {})).signin?.focus).toBe("left");
  expect(await exists(t, first)).toBe(true);

  // Replacing deletes the old file
  const second = await store(t);
  await staff.mutation(api.admin.sitePhotos.set, { slot: "signin", storageId: second, focus: "right", reason: "New photo" });
  expect(await exists(t, first)).toBe(false);
  const list = await staff.query(api.admin.sitePhotos.list, {});
  expect(list.find((r) => r.slot === "signin")?.photo?.updatedByName).toBe("Chika Catalog");

  await staff.mutation(api.admin.sitePhotos.remove, { slot: "signin", reason: "Back to plain" });
  expect((await t.query(api.sitePhotos.auth, {})).signin).toBeNull();
  expect(await exists(t, second)).toBe(false);

  const audit = await t.run(async (ctx) => (await ctx.db.query("auditLog").collect()).map((a) => a.action));
  expect(audit.filter((a) => a.startsWith("sitePhoto."))).toEqual(["sitePhoto.set", "sitePhoto.set", "sitePhoto.set", "sitePhoto.remove"]);
});

test("only staff with content.manage can change photos, and only images are accepted", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const photo = await store(t);
  await expect(as(t, s.shopper).mutation(api.admin.sitePhotos.set, { slot: "signup", storageId: photo, focus: "center", reason: "x" })).rejects.toThrow();
  await expect(as(t, s.finance).mutation(api.admin.sitePhotos.set, { slot: "signup", storageId: photo, focus: "center", reason: "x" })).rejects.toThrow(/FORBIDDEN/);
  await expect(as(t, s.finance).query(api.admin.sitePhotos.list, {})).rejects.toThrow(/FORBIDDEN/);

  const pdf = await store(t, "application/pdf");
  await expect(as(t, s.catalog).mutation(api.admin.sitePhotos.set, { slot: "signup", storageId: pdf, focus: "center", reason: "x" })).rejects.toThrow(/UPLOAD_NOT_IMAGE/);

  // Focus-only change needs a photo already there
  await expect(as(t, s.catalog).mutation(api.admin.sitePhotos.set, { slot: "signup", focus: "left", reason: "x" })).rejects.toThrow(/PHOTO_REQUIRED/);
  expect((await t.query(api.sitePhotos.auth, {})).signup).toBeNull();
});

test("the app's farmer sign-up screens each take their own photo", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const staff = as(t, s.catalog);

  const none = await t.query(api.sitePhotos.farmerSignup, {});
  // Convex returns object keys sorted
  expect(Object.keys(none).sort()).toEqual(["bank", "code", "intro", "login", "phone", "pin", "profile", "review", "submitted"]);
  expect(Object.values(none).every((p) => p === null)).toBe(true);

  const field = await store(t);
  const basket = await store(t);
  await staff.mutation(api.admin.sitePhotos.set, { slot: "farmer_phone", storageId: field, focus: "center", reason: "Field at sunrise" });
  await staff.mutation(api.admin.sitePhotos.set, { slot: "farmer_bank", storageId: basket, focus: "left", reason: "Harvest basket" });
  const shown = await t.query(api.sitePhotos.farmerSignup, {});
  expect(shown.phone?.url).toEqual(expect.any(String));
  expect(shown.bank?.focus).toBe("left");
  // Each slot keeps its own file (convex-test gives every file the same URL)
  const rows = await t.run(async (ctx) => await ctx.db.query("sitePhotos").collect());
  expect(Object.fromEntries(rows.map((r) => [r.slot, r.storageId]))).toEqual({ farmer_phone: field, farmer_bank: basket });
  expect(shown.code).toBeNull();

  // The website's panels are separate slots
  expect(await t.query(api.sitePhotos.auth, {})).toEqual({ signin: null, signup: null });
  // Staff see every slot: the website's two, then the app's nine
  const list = await staff.query(api.admin.sitePhotos.list, {});
  expect(list.map((r) => r.slot)).toEqual([
    "signin", "signup", "farmer_intro", "farmer_phone", "farmer_code", "farmer_pin", "farmer_profile", "farmer_bank", "farmer_review", "farmer_submitted", "farmer_login",
  ]);
});
