/** Generates a product key like "CARSHARE-7F3K-9Q2M-XB4T". Alphabet avoids look-alikes. */
export function keygen(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${prefix}-${block()}-${block()}-${block()}`;
}
