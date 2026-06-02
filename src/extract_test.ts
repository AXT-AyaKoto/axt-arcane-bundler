import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  exportsToExtractForFile,
  extractFromSource,
} from "./extract.ts";

const TWO_CLASS_FILE = `// ================================================================
// Exports
// ================================================================

/**
 * First class docs.
 */
export class Alpha {
  run(): void {}
}

/**
 * Second class docs.
 */
export class Beta {
  run(): void {}
}
`;

const WITH_PRIVATE_HELPER = `/**
 * @private
 */
const helper = (): number => 1;

/**
 * Main export.
 */
export class Worker {
  work(): number {
    return helper();
  }
}
`;

const WITH_BANNER = `// ================================================================
// Exports
// ================================================================

/**
 * Documented.
 */
export class Documented {
  x = 1;
}
`;

Deno.test("extractFromSource includes only selected export from multi-export file", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assertStringIncludes(out, "class Alpha");
  assertFalse(out.includes("class Beta"));
  assertStringIncludes(out, "First class docs");
});

Deno.test("extractFromSource strips export keyword", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assertFalse(out.includes("export class"));
  assertStringIncludes(out, "class Alpha");
});

Deno.test("extractFromSource does not leave space before class after export removal", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assertFalse(out.includes(" class Alpha"));
  assertStringIncludes(out, "*/\nclass Alpha");
});

Deno.test("extractFromSource includes non-export intra-file dependencies", () => {
  const out = extractFromSource(WITH_PRIVATE_HELPER, "worker.ts", new Set([
    "Worker",
  ]));
  assertStringIncludes(out, "const helper");
  assertStringIncludes(out, "class Worker");
});

Deno.test("extractFromSource preserves JSDoc and omits section banners", () => {
  const out = extractFromSource(WITH_BANNER, "doc.ts", new Set(["Documented"]));
  assertEquals(out.trimStart().startsWith("/**"), true);
  assertFalse(out.includes("===="));
});

Deno.test("exportsToExtractForFile uses selected exports when present", () => {
  const byPath = new Map([["/src/two.ts", ["Alpha", "Beta"]]]);
  const names = exportsToExtractForFile(
    "/src/two.ts",
    ["Alpha"],
    byPath,
  );
  assertEquals(names, new Set(["Alpha"]));
});

Deno.test("exportsToExtractForFile includes all exports for dependency-only file", () => {
  const byPath = new Map([
    ["/src/two.ts", ["Alpha", "Beta"]],
    ["/src/dep.ts", ["DepOnly"]],
  ]);
  const names = exportsToExtractForFile(
    "/src/dep.ts",
    ["Alpha"],
    byPath,
  );
  assertEquals(names, new Set(["DepOnly"]));
});
