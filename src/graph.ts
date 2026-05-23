import { ARCANE_NAME, ARCANE_SCOPE, jsrFileUrl } from "./constants.ts";
import { fetchExportMap } from "./exports.ts";
import type { WizardSelection } from "./wizard.ts";

interface ModuleGraphDependency {
  type: string;
  kind: string;
  specifier: string;
}

interface ModuleGraphEntry {
  dependencies?: ModuleGraphDependency[];
}

type ModuleGraph2 = Record<string, ModuleGraphEntry>;

function versionMetaUrl(version: string): string {
  return `https://jsr.io/@${ARCANE_SCOPE}/${ARCANE_NAME}/${version}_meta.json`;
}

function normalizePackagePath(modulePath: string): string {
  const stripped = modulePath.replace(/^\.\//, "");
  return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

function resolveRelativePath(fromPath: string, specifier: string): string {
  const baseDir = fromPath.replace(/\/[^/]+$/, "") || "";
  return new URL(specifier, `https://x${baseDir}/`).pathname;
}

async function fetchModuleGraph(version: string): Promise<ModuleGraph2> {
  const response = await fetch(versionMetaUrl(version));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch version metadata for ${version} (${response.status}).`,
    );
  }
  const data = (await response.json()) as { moduleGraph2?: ModuleGraph2 };
  if (!data.moduleGraph2) {
    throw new Error(`Version metadata for ${version} has no moduleGraph2.`);
  }
  return data.moduleGraph2;
}

function collectReachableModules(
  graph: ModuleGraph2,
  startPaths: string[],
): Set<string> {
  const reached = new Set<string>();
  const queue = [...startPaths];

  while (queue.length > 0) {
    const current = queue.pop()!;
    if (reached.has(current)) continue;
    if (!(current in graph)) continue;

    reached.add(current);
    for (const dep of graph[current].dependencies ?? []) {
      if (dep.kind !== "import" || !dep.specifier.startsWith(".")) continue;
      const resolved = resolveRelativePath(current, dep.specifier);
      if (resolved in graph && !reached.has(resolved)) {
        queue.push(resolved);
      }
    }
  }

  return reached;
}

const RELATIVE_IMPORT_RE =
  /import\s+(?:type\s+)?(?:[\w*{}\s,]+\s+from\s+)?["'](\.\/[^"']+)["']\s*;?/g;

async function fetchSource(version: string, pkgPath: string): Promise<string> {
  const response = await fetch(jsrFileUrl(version, pkgPath));
  if (!response.ok) {
    throw new Error(`Failed to fetch ${pkgPath}: HTTP ${response.status}`);
  }
  return response.text();
}

function localDepsFromSource(source: string, pkgPath: string): string[] {
  const deps: string[] = [];
  for (const match of source.matchAll(RELATIVE_IMPORT_RE)) {
    deps.push(resolveRelativePath(pkgPath, match[1]));
  }
  return deps;
}

async function topologicalSortPaths(
  paths: Set<string>,
  version: string,
): Promise<string[]> {
  const list = [...paths];
  const sources = new Map<string, string>();
  for (const p of list) {
    sources.set(p, await fetchSource(version, p));
  }

  const visited = new Set<string>();
  const temp = new Set<string>();
  const order: string[] = [];

  function visit(p: string): void {
    if (visited.has(p)) return;
    if (temp.has(p)) return;
    temp.add(p);
    const source = sources.get(p) ?? "";
    for (const dep of localDepsFromSource(source, p)) {
      if (paths.has(dep)) visit(dep);
    }
    temp.delete(p);
    visited.add(p);
    order.push(p);
  }

  for (const p of [...list].sort()) {
    visit(p);
  }

  return order;
}

export async function resolveModuleGraph(
  selection: WizardSelection,
): Promise<string[]> {
  const version = selection.resolved.fetchVersion;
  const exportMap = await fetchExportMap(version);
  const graph = await fetchModuleGraph(version);

  const startPaths: string[] = [];
  for (const name of selection.selectedExports) {
    const modulePath = exportMap.get(name);
    if (!modulePath) {
      console.error(
        `Error: Export "${name}" is not provided by @ayaexptech/arcane@${version}.`,
      );
      Deno.exit(1);
    }
    startPaths.push(normalizePackagePath(modulePath));
  }

  const reachable = collectReachableModules(graph, startPaths);
  const srcPaths = new Set(
    [...reachable].filter((p) => p.startsWith("/src/") && p.endsWith(".ts")),
  );

  if (srcPaths.size === 0) {
    console.error("Error: No Arcane source modules were resolved for bundling.");
    Deno.exit(1);
  }

  return topologicalSortPaths(srcPaths, version);
}
