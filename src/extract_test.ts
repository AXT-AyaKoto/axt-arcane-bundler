import { assertEquals, assertFalse, assertStringIncludes } from "@std/assert";
import {
  extractFromSource,
  resolveExportsToExtract,
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

const FILE_A_IMPORTS_KEEP = `import { Keep } from "./b.ts";

export class A {
  make(): Keep {
    return new Keep();
  }
}
`;

const FILE_B_KEEP_AND_DROP = `/**
 * @private
 */
const helper = (): number => 1;

export type KeepMeta = { n: number };

export class Keep {
  meta(): KeepMeta {
    return { n: helper() };
  }
}

export class Drop {
  gone(): void {}
}
`;

const FILE_A_IMPORTS_FOO = `import { Foo } from "./b.ts";

export class A {
  make(): Foo {
    return new Foo();
  }
}
`;

const FILE_B_IMPORTS_BAR = `import { Bar } from "./c.ts";

export class Foo {
  bar(): Bar {
    return new Bar();
  }
}

export class UnusedFoo {}
`;

const FILE_C_BAR_AND_DROP = `export class Bar {
  ok(): void {}
}

export class DropBar {
  gone(): void {}
}
`;

const FILE_A_IMPORTS_KEEP_ALIAS = `import { Keep as KeepAlias } from "./b.ts";

export class A {
  make(): KeepAlias {
    return new KeepAlias();
  }
}
`;

Deno.test("resolveExportsToExtract keeps only selected export in its own file", () => {
  const sources = new Map([
    ["/src/two.ts", TWO_CLASS_FILE],
  ]);
  const byPath = new Map([["/src/two.ts", ["Alpha", "Beta"]]]);
  const names = resolveExportsToExtract(sources, ["Alpha"], byPath);
  assertEquals(names.get("/src/two.ts"), new Set(["Alpha"]));
});

Deno.test("resolveExportsToExtract keeps only imported names from a dependency file", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A"], byPath);
  assertEquals(names.get("/src/a.ts"), new Set(["A"]));
  assertEquals(names.get("/src/b.ts"), new Set(["Keep"]));

  const out = extractFromSource(
    FILE_B_KEEP_AND_DROP,
    "b.ts",
    names.get("/src/b.ts")!,
  );
  assertStringIncludes(out, "const helper");
  assertStringIncludes(out, "type KeepMeta");
  assertStringIncludes(out, "class Keep");
  assertFalse(out.includes("class Drop"));
});

Deno.test("resolveExportsToExtract follows a chain of named imports", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_FOO],
    ["/src/b.ts", FILE_B_IMPORTS_BAR],
    ["/src/c.ts", FILE_C_BAR_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Foo", "UnusedFoo"]],
    ["/src/c.ts", ["Bar", "DropBar"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A"], byPath);
  assertEquals(names.get("/src/a.ts"), new Set(["A"]));
  assertEquals(names.get("/src/b.ts"), new Set(["Foo"]));
  assertEquals(names.get("/src/c.ts"), new Set(["Bar"]));
});

Deno.test("resolveExportsToExtract unions selected names with imported names", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A", "Drop"], byPath);
  assertEquals(names.get("/src/a.ts"), new Set(["A"]));
  assertEquals(names.get("/src/b.ts"), new Set(["Keep", "Drop"]));
});

Deno.test("resolveExportsToExtract uses original name for aliased imports", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP_ALIAS],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A"], byPath);
  assertEquals(names.get("/src/b.ts"), new Set(["Keep"]));
});
