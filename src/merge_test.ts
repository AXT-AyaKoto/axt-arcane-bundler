import { assertEquals, assertFalse } from "@std/assert";
import { normalizeBlankLines } from "./merge.ts";

Deno.test("normalizeBlankLines collapses three or more newlines to two", () => {
  const input = "a\n\n\n\nb";
  assertEquals(normalizeBlankLines(input), "a\n\nb");
});

Deno.test("normalizeBlankLines leaves single blank line unchanged", () => {
  const input = "a\n\nb";
  assertEquals(normalizeBlankLines(input), "a\n\nb");
});

Deno.test("normalizeBlankLines removes triple newline from joined chunks", () => {
  const joined = ["header", "", "chunk1", "", "chunk2"].join("\n");
  assertFalse(normalizeBlankLines(joined).includes("\n\n\n"));
});
