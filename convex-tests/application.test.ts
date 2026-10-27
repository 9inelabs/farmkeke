// Farmer applications (27 Oct 2026 KYC): the NIN and at least 3 farm photos
// are required before an application can be submitted, and only staff who
// approve farmers see the full NIN.
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./modules";
import { grantStaff } from "./staff";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

type T = ReturnType<typeof convexTest>;
type U = { id: any; sessionId: any };
const as = (t: T, u: U) => t.withIdentity({ subject: `${u.id}|${u.sessionId}`, tokenIdentifier: `test|${u.id}` });

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const user = async (fields: Record<string, unknown>) => {
      const id = await ctx.db.insert("users", fields as any);
      const sessionId = await ctx.db.insert("authSessions", { userId: id, expirationTime: Date.now() + 1e10 });
      if (typeof fields.staffRole === "string") await grantStaff(ctx, { id, sessionId }, fields.staffRole);
      return { id, sessionId };
    };
    return {
      farmer: await user({ name: "Okafor John", phone: "+2348030000001" }),
      admin: await user({ name: "Sam Admin", email: "sam@example.com", staffRole: "super_admin" }),
      support: await user({ name: "Sue Support", email: "sue@example.com", staffRole: "support" }),
    };
  });
}

/** A stored JPEG, as the app's upload leaves it. */
async function photo(t: T) {
  return await t.run(async (ctx) => {
    const id = await ctx.storage.store(new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" }));
    // convex-test doesn't record the content type the upload check reads
    await (ctx.db as any).patch(id, { contentType: "image/jpeg" });
    return id;
  });
}

test("an application needs the farmer's NIN and 3 farm photos before it can be sent", async () => {
  const t = convexTest(schema, modules);
  const s = await seed(t);
  const farmer = as(t, s.farmer);
  const applicationId = await farmer.mutation(api.farmerApplications.start, {});

  // The NIN is 11 digits; spaces and dashes are allowed and dropped
  await expect(farmer.mutation(api.farmerApplications.saveProfile, { nin: "1234" })).rejects.toThrow(/INVALID_NIN/);
  await expect(farmer.mutation(api.farmerApplications.saveProfile, { nin: "1234567890a" })).rejects.toThrow(/INVALID_NIN/);
  await farmer.mutation(api.farmerApplications.saveProfile, {
    fullName: "Okafor John",
    farmName: "Okafor's Farm",
    nin: "123 4567-8901",
    state: "Imo",
    lga: "Owerri North",
    address: "Km 4 Owerri-Aba Road",
  });
  await farmer.mutation(api.farmerApplications.savePayout, { bankCode: "058", accountNumber: "0123456789", accountName: "Okafor John" });

  let mine = (await farmer.query(api.farmerApplications.mine, {}))!;
  expect(mine.nin).toBe("12345678901");
  expect(mine.problems).toEqual({ documents: ["Add at least 3 photos of your farm"] });
  await expect(farmer.mutation(api.farmerApplications.submit, { acceptTerms: true })).rejects.toThrow(/INCOMPLETE/);

  // Saving only part of the profile (the profile photo goes on its own) keeps the rest
  await farmer.mutation(api.farmerApplications.saveProfile, { photoStorageId: await photo(t) });
  mine = (await farmer.query(api.farmerApplications.mine, {}))!;
  expect([mine.nin, mine.farmName, mine.state, mine.lga, mine.address]).toEqual(["12345678901", "Okafor's Farm", "Imo", "Owerri North", "Km 4 Owerri-Aba Road"]);
  expect(mine.photoUrl).not.toBeNull();

  await farmer.mutation(api.farmerApplications.addDocument, { kind: "farm_photo", storageId: await photo(t) });
  const second = await farmer.mutation(api.farmerApplications.addDocument, { kind: "farm_photo", storageId: await photo(t) });
  mine = (await farmer.query(api.farmerApplications.mine, {}))!;
  expect(mine.problems).toEqual({ documents: ["Add 1 more photo of your farm"] });

  // A removed photo no longer counts
  await farmer.mutation(api.farmerApplications.removeDocument, { documentId: second });
  expect((await farmer.query(api.farmerApplications.mine, {}))!.problems).toEqual({ documents: ["Add 2 more photos of your farm"] });
  await farmer.mutation(api.farmerApplications.addDocument, { kind: "farm_photo", storageId: await photo(t) });
  await farmer.mutation(api.farmerApplications.addDocument, { kind: "farm_photo", storageId: await photo(t) });
  expect((await farmer.query(api.farmerApplications.mine, {}))!.problems).toEqual({});

  // A NIN removed after that blocks sending again
  await farmer.mutation(api.farmerApplications.saveProfile, { nin: "" });
  expect((await farmer.query(api.farmerApplications.mine, {}))!.problems).toEqual({ farm: ["Add your 11-digit NIN"] });
  await farmer.mutation(api.farmerApplications.saveProfile, { nin: "12345678901" });

  const { reference } = await farmer.mutation(api.farmerApplications.submit, { acceptTerms: true });
  expect(reference).toMatch(/^FA-/);

  // Staff who approve farmers see the whole NIN; other staff only its end
  const full = await as(t, s.admin).query(api.admin.farmerRequests.get, { applicationId });
  expect(full!.application.nin).toBe("12345678901");
  expect(full!.documents.filter((d: any) => d.kind === "farm_photo")).toHaveLength(3);
  const masked = await as(t, s.support).query(api.admin.farmerRequests.get, { applicationId });
  expect(masked!.application.nin).toBe("•••••••8901");
});
