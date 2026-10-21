import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANCESTRY_JOURNAL_PACK,
  generatePersonalContent,
} from "../tools/personal-content.mjs";

describe("Journaux encyclopédiques d’Ascendance 10-D3", () => {
  it("génère 26 Journaux sélectionnables depuis les descriptions canoniques", () => {
    const output = fs.mkdtempSync(path.join(os.tmpdir(), "relis-d3-journals-"));
    try {
      const result = generatePersonalContent(".", output);
      expect(result.counts[ANCESTRY_JOURNAL_PACK.name]).toBe(26);
      const files = fs
        .readdirSync(path.join(output, ANCESTRY_JOURNAL_PACK.name))
        .filter((file) => file.endsWith(".json"));
      expect(files).toHaveLength(26);
      const journal = JSON.parse(
        fs.readFileSync(
          path.join(output, ANCESTRY_JOURNAL_PACK.name, files[0]),
          "utf8",
        ),
      );
      expect(journal._key).toMatch(/^!journal!/u);
      expect(journal.pages).toHaveLength(1);
      expect(journal.pages[0]._key).toBe(
        `!journal.pages!${journal._id}.${journal.pages[0]._id}`,
      );
      expect(journal.pages[0].text.content).toContain("<h3>");
      expect(journal.flags.relis.ancestryRelisId).toMatch(/^CRE-ANC-/u);
    } finally {
      fs.rmSync(output, { recursive: true, force: true });
    }
  });
});
