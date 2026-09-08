import { describe, expect, it } from "vitest";
import { ACTOR_TYPES, ITEM_TYPES, JOURNAL_PAGE_TYPES } from "../src/config";

describe("registre gelé des types", () => {
  it("conserve les 58 types métier et leurs clés uniques", () => {
    expect(ACTOR_TYPES).toHaveLength(11);
    expect(ITEM_TYPES).toHaveLength(26);
    expect(JOURNAL_PAGE_TYPES).toHaveLength(21);
    expect(
      new Set([...ACTOR_TYPES, ...ITEM_TYPES, ...JOURNAL_PAGE_TYPES]).size,
    ).toBe(58);
  });
});
