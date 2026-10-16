import assert from "node:assert/strict";
import { test } from "node:test";
import { stripTypes } from "./strip.ts";

test("stripTypes removes type annotations and keeps JSDoc", () => {
  const out = stripTypes(`/**
 * Adds.
 */
class Adder {
  #base: number;
  constructor(base: number) {
    this.#base = base;
  }
  add<T extends number>(x: T): number {
    return this.#base + (x as number);
  }
}`);
  assert.ok(out.includes("Adds."));
  assert.ok(out.includes("add(x) {"));
  assert.ok(!out.includes(" as number"));
  assert.ok(!out.includes(": number"));
});

test("stripTypes leaves no trailing whitespace", () => {
  const out = stripTypes("const a: number = 1;\nlet b: string;\n");
  assert.ok(!/[ \t]$/m.test(out));
});
