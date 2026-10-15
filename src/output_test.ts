import { test } from "node:test";
import { equal, ok } from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { formatOutput } from "./output.ts";
import { extractFromSource } from "./extract.ts";

const source = `// ======== Copied from AyaExpTech Arcane ========
export interface Result { value: number }
export type Optional = number | undefined;
/** Counter docs. */
export class Counter<T extends number> {
  #value = 0;
  increment(amount: T): Result {
    this.#value += amount;
    return { value: this.#value } satisfies Result;
  }
  optional(value?: Optional): number { return value ?? this.#value; }
}
`;

test("TypeScript output is byte-for-byte unchanged", () => {
  equal(formatOutput(source, "typescript"), source);
});

test("JavaScript output strips types after extraction and preserves modern syntax and docs", () => {
  const extracted = extractFromSource(source, "counter.ts", new Set(["Counter"]));
  const output = formatOutput(extracted, "javascript");
  for (const token of ["interface Result", "type Optional", "satisfies Result", "export class", "amount: T"]) {
    ok(!output.includes(token), token);
  }
  ok(output.includes("/** Counter docs. */"));
  ok(output.includes("#value"));
  ok(output.includes("??"));
  equal(runInNewContext(`${output}\nnew Counter().increment(3).value`), 3);
  equal(runInNewContext(`${output}\nnew Counter().optional()`), 0);
});
