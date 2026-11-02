import { describe, it, expect } from "vitest";
import { canCreateListing } from "../listingLimit";

describe("canCreateListing", () => {
  it("lets an admin live-listing bypass the owner cap", () => {
    expect(canCreateListing({ isAdminLive: true, listingCount: 3, listingLimit: 3 })).toBe(true);
  });

  it("blocks an owner at the cap", () => {
    expect(canCreateListing({ isAdminLive: false, listingCount: 3, listingLimit: 3 })).toBe(false);
  });

  it("allows an owner below the cap", () => {
    expect(canCreateListing({ isAdminLive: false, listingCount: 2, listingLimit: 3 })).toBe(true);
  });
});
