import assert from "node:assert/strict";
import { test } from "node:test";
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

test("extractFromSource includes only selected export from multi-export file", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assert.ok(out.includes("class Alpha"));
  assert.ok(!out.includes("class Beta"));
  assert.ok(out.includes("First class docs"));
});

test("extractFromSource strips export keyword", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assert.ok(!out.includes("export class"));
  assert.ok(out.includes("class Alpha"));
});

test("extractFromSource does not leave space before class after export removal", () => {
  const out = extractFromSource(TWO_CLASS_FILE, "two.ts", new Set(["Alpha"]));
  assert.ok(!out.includes(" class Alpha"));
  assert.ok(out.includes("*/\nclass Alpha"));
});

test("extractFromSource includes non-export intra-file dependencies", () => {
  const out = extractFromSource(WITH_PRIVATE_HELPER, "worker.ts", new Set([
    "Worker",
  ]));
  assert.ok(out.includes("const helper"));
  assert.ok(out.includes("class Worker"));
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

test("extractFromSource includes exported type deps used by selected export", () => {
  const out = extractFromSource(
    WITH_EXPORTED_TYPE_DEP,
    "graphs.ts",
    new Set(["DirectedGraph"]),
  );
  assert.ok(out.includes("type CSRGraph"));
  assert.ok(out.includes("class DirectedGraph"));
  assert.ok(!out.includes("class UndirectedGraph"));
  assert.ok(!out.includes("export type"));
  assert.ok(!out.includes("export class"));
});

test("extractFromSource includes nested exported type deps", () => {
  const out = extractFromSource(
    WITH_NESTED_EXPORTED_TYPES,
    "graphs.ts",
    new Set(["DirectedGraph"]),
  );
  assert.ok(out.includes("type Edge"));
  assert.ok(out.includes("type CSRGraph"));
  assert.ok(out.includes("class DirectedGraph"));
  // Source order: Edge, CSRGraph, DirectedGraph
  assert.deepEqual(out.indexOf("type Edge") < out.indexOf("type CSRGraph"), true);
  assert.deepEqual(
    out.indexOf("type CSRGraph") < out.indexOf("class DirectedGraph"),
    true,
  );
});

test("extractFromSource includes exported interface deps", () => {
  const out = extractFromSource(
    WITH_EXPORTED_INTERFACE_DEP,
    "graph.ts",
    new Set(["Graph"]),
  );
  assert.ok(out.includes("interface Node"));
  assert.ok(out.includes("class Graph"));
  assert.ok(!out.includes("export "));
});

test("extractFromSource preserves JSDoc and omits section banners", () => {
  const out = extractFromSource(WITH_BANNER, "doc.ts", new Set(["Documented"]));
  assert.deepEqual(out.trimStart().startsWith("/**"), true);
  assert.ok(!out.includes("===="));
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

test("resolveExportsToExtract keeps only selected export in its own file", () => {
  const sources = new Map([
    ["/src/two.ts", TWO_CLASS_FILE],
  ]);
  const byPath = new Map([["/src/two.ts", ["Alpha", "Beta"]]]);
  const names = resolveExportsToExtract(sources, ["Alpha"], byPath);
  assert.deepEqual(names.get("/src/two.ts"), new Set(["Alpha"]));
});

test("resolveExportsToExtract keeps only imported names from a dependency file", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A"], byPath);
  assert.deepEqual(names.get("/src/a.ts"), new Set(["A"]));
  assert.deepEqual(names.get("/src/b.ts"), new Set(["Keep"]));

  const out = extractFromSource(
    FILE_B_KEEP_AND_DROP,
    "b.ts",
    names.get("/src/b.ts")!,
  );
  assert.ok(out.includes("const helper"));
  assert.ok(out.includes("type KeepMeta"));
  assert.ok(out.includes("class Keep"));
  assert.ok(!out.includes("class Drop"));
});

test("resolveExportsToExtract follows a chain of named imports", () => {
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
  assert.deepEqual(names.get("/src/a.ts"), new Set(["A"]));
  assert.deepEqual(names.get("/src/b.ts"), new Set(["Foo"]));
  assert.deepEqual(names.get("/src/c.ts"), new Set(["Bar"]));
});

test("resolveExportsToExtract unions selected names with imported names", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A", "Drop"], byPath);
  assert.deepEqual(names.get("/src/a.ts"), new Set(["A"]));
  assert.deepEqual(names.get("/src/b.ts"), new Set(["Keep", "Drop"]));
});

test("resolveExportsToExtract uses original name for aliased imports", () => {
  const sources = new Map([
    ["/src/a.ts", FILE_A_IMPORTS_KEEP_ALIAS],
    ["/src/b.ts", FILE_B_KEEP_AND_DROP],
  ]);
  const byPath = new Map([
    ["/src/a.ts", ["A"]],
    ["/src/b.ts", ["Keep", "Drop"]],
  ]);
  const names = resolveExportsToExtract(sources, ["A"], byPath);
  assert.deepEqual(names.get("/src/b.ts"), new Set(["Keep"]));
});

test("extractFromSource omits type-only declarations and their JSDoc with omitTypeOnly", () => {
  const out = extractFromSource(
    WITH_NESTED_EXPORTED_TYPES.replace(
      "export type CSRGraph",
      "/**\n * CSR docs.\n */\nexport type CSRGraph",
    ),
    "graphs.ts",
    new Set(["DirectedGraph"]),
    { omitTypeOnly: true },
  );
  assert.ok(!out.includes("type Edge"));
  assert.ok(!out.includes("type CSRGraph"));
  assert.ok(!out.includes("CSR docs"));
  assert.ok(out.includes("class DirectedGraph"));
});

test("extractFromSource emits a multi-declarator variable statement once", () => {
  const source = `const a = 1, b = 2;\n\nexport const sum = (): number => a + b;\n`;
  const out = extractFromSource(source, "vars.ts", new Set(["sum"]));
  assert.equal(out.split("const a = 1, b = 2;").length - 1, 1);
});
