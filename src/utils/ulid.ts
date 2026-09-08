const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(time: number): string {
  let value = Math.max(0, Math.floor(time));
  let output = "";
  for (let index = 0; index < 10; index += 1) {
    output = CROCKFORD[value % 32] + output;
    value = Math.floor(value / 32);
  }
  return output;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CROCKFORD[byte & 31]).join("");
}

export function createRelisId(now = Date.now()): string {
  return `${encodeTime(now)}${encodeRandom()}`;
}

export function isRelisId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
}
