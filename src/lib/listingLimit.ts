export function canCreateListing(input: {
  isAdminLive: boolean;
  listingCount: number;
  listingLimit: number;
}): boolean {
  return input.isAdminLive || input.listingCount < input.listingLimit;
}
