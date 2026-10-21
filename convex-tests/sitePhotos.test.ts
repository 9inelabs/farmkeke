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
