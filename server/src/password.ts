const ITERATIONS = 100_000;
const SCHEME = "pbkdf2";

const bytesToB64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const b64ToBytes = (b64: string): Uint8Array => Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));

export async function hashPassword(password: string, existingSaltB64?: string): Promise<string> {
  const salt = existingSaltB64
    ? b64ToBytes(existingSaltB64)
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as unknown as BufferSource, iterations: ITERATIONS },
    keyMaterial,
    256
  );
  return `${SCHEME}$${ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(new Uint8Array(bits))}`;
}

const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, , saltB64, expected] = stored.split("$");
  if (scheme !== SCHEME || !saltB64 || !expected) return false;
  const candidate = await hashPassword(password, saltB64);
  return timingSafeEqual(candidate, stored);
}
