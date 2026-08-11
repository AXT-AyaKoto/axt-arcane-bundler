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

const WITH_EXPORTED_TYPE_DEP = `export type CSRGraph = {
  head: Uint32Array;
  to: Uint32Array;
};

export class DirectedGraph {
  toCSR(): CSRGraph {
    return { head: new Uint32Array(), to: new Uint32Array() };
  }
}

export class UndirectedGraph {
  toCSR(): CSRGraph {
    return { head: new Uint32Array(), to: new Uint32Array() };
  }
}
`;

const WITH_NESTED_EXPORTED_TYPES = `export type Edge = { to: number };

export type CSRGraph = { edges: Edge[] };

export class DirectedGraph {
  toCSR(): CSRGraph {
    return { edges: [] };
  }
}
`;

const WITH_EXPORTED_INTERFACE_DEP = `export interface Node {
  id: number;
}

export class Graph {
  get(id: number): Node {
    return { id };
  }
}
`;

Deno.test("extractFromSource includes exported type deps used by selected export", () => {
  const out = extractFromSource(
    WITH_EXPORTED_TYPE_DEP,
    "graphs.ts",
    new Set(["DirectedGraph"]),
  );
  assertStringIncludes(out, "type CSRGraph");
  assertStringIncludes(out, "class DirectedGraph");
  assertFalse(out.includes("class UndirectedGraph"));
  assertFalse(out.includes("export type"));
  assertFalse(out.includes("export class"));
});

Deno.test("extractFromSource includes nested exported type deps", () => {
  const out = extractFromSource(
    WITH_NESTED_EXPORTED_TYPES,
    "graphs.ts",
    new Set(["DirectedGraph"]),
  );
  assertStringIncludes(out, "type Edge");
  assertStringIncludes(out, "type CSRGraph");
  assertStringIncludes(out, "class DirectedGraph");
  // Source order: Edge, CSRGraph, DirectedGraph
  assertEquals(out.indexOf("type Edge") < out.indexOf("type CSRGraph"), true);
  assertEquals(
    out.indexOf("type CSRGraph") < out.indexOf("class DirectedGraph"),
    true,
  );
});

Deno.test("extractFromSource includes exported interface deps", () => {
  const out = extractFromSource(
    WITH_EXPORTED_INTERFACE_DEP,
    "graph.ts",
    new Set(["Graph"]),
  );
  assertStringIncludes(out, "interface Node");
  assertStringIncludes(out, "class Graph");
  assertFalse(out.includes("export "));
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
