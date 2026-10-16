import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeBlankLines } from "./merge.ts";

test("normalizeBlankLines collapses three or more newlines to two", () => {
  const input = "a\n\n\n\nb";
  assert.deepEqual(normalizeBlankLines(input), "a\n\nb");
});

test("normalizeBlankLines leaves single blank line unchanged", () => {
  const input = "a\n\nb";
  assert.deepEqual(normalizeBlankLines(input), "a\n\nb");
});

test("normalizeBlankLines removes triple newline from joined chunks", () => {
  const joined = ["header", "", "chunk1", "", "chunk2"].join("\n");
  assert.ok(!normalizeBlankLines(joined).includes("\n\n\n"));
});
