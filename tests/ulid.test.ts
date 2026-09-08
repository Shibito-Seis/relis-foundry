import { describe, expect, it } from "vitest";
import { createRelisId, isRelisId } from "../src/utils/ulid";

describe("identifiants RE:LIS", () => {
  it("produit un ULID opaque de 26 caractères", () => {
    const value = createRelisId(1_789_000_000_000);
    expect(value).toHaveLength(26);
    expect(isRelisId(value)).toBe(true);
  });

  it("rejette les identifiants hors alphabet", () => {
    expect(isRelisId("not-a-relis-id")).toBe(false);
    expect(isRelisId("0000000000IIIIIIIIIIIIIIII")).toBe(false);
  });
});
