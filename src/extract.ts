import ts from "typescript";
import { jsrFileUrl } from "./constants.ts";
import { resolveRelativePath } from "./path.ts";

export interface TopLevelDecl {
  name: string;
  node: ts.Node;
  isExport: boolean;
}

function seedSelectedExports(
  selectedExports: string[],
  exportsByPath: Map<string, string[]>,
): Map<string, Set<string>> {
  const selected = new Set(selectedExports);
  const needed = new Map<string, Set<string>>();
  for (const [packagePath, names] of exportsByPath) {
    for (const name of names) {
      if (!selected.has(name)) continue;
      const set = needed.get(packagePath) ?? new Set<string>();
      set.add(name);
      needed.set(packagePath, set);
    }
  }
  return needed;
}

/**
 * For each file, the export names that must be kept: selected exports plus
 * named relative imports actually referenced by those exports (and their
 * intra-file deps).
 */
export function resolveExportsToExtract(
  sources: Map<string, string>,
  selectedExports: string[],
  exportsByPath: Map<string, string[]>,
): Map<string, Set<string>> {
  const needed = seedSelectedExports(selectedExports, exportsByPath);
  const analyzed = new Map<string, Set<string>>();
  const queue = [...needed.keys()];

  while (queue.length > 0) {
    const packagePath = queue.pop()!;
    const names = needed.get(packagePath);
    const source = sources.get(packagePath);
    if (!names || names.size === 0 || source == null) continue;

    const prev = analyzed.get(packagePath);
    if (prev && names.size === prev.size && [...names].every((n) => prev.has(n))) {
      continue;
    }
    analyzed.set(packagePath, new Set(names));

    const fileName = packagePath.replace(/^\//, "").split("/").pop() ??
      "module.ts";
    const { usedImports } = analyzeSource(source, fileName, names, packagePath);

    for (const [fromPath, importNames] of usedImports) {
      if (!sources.has(fromPath)) continue;
      let set = needed.get(fromPath);
      if (!set) {
        set = new Set<string>();
        needed.set(fromPath, set);
      }
      let added = false;
      for (const name of importNames) {
        if (set.has(name)) continue;
        set.add(name);
        added = true;
      }
      if (added) queue.push(fromPath);
    }
  }

  return needed;
}

export function getTopLevelDecls(sf: ts.SourceFile): TopLevelDecl[] {
  const out: TopLevelDecl[] = [];
  for (const stmt of sf.statements) {
    const isExport = ts.canHaveModifiers(stmt) &&
      !!stmt.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

    if (ts.isClassDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, node: stmt, isExport });
    } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, node: stmt, isExport });
    } else if (ts.isInterfaceDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, node: stmt, isExport });
    } else if (ts.isTypeAliasDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, node: stmt, isExport });
    } else if (ts.isEnumDeclaration(stmt) && stmt.name) {
      out.push({ name: stmt.name.text, node: stmt, isExport });
    } else if (ts.isVariableStatement(stmt)) {
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) {
          out.push({ name: d.name.text, node: stmt, isExport });
        }
      }
    } else if (ts.isExportDeclaration(stmt) && !stmt.moduleSpecifier) {
      if (stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) {
          const name = (el.name ?? el.propertyName)?.text;
          if (name) {
            out.push({ name, node: stmt, isExport: true });
          }
        }
      }
    }
  }
  return out;
}

function importDeclarationOf(
  node: ts.Node | undefined,
): ts.ImportDeclaration | undefined {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isImportDeclaration(cur)) return cur;
    cur = cur.parent;
  }
  return undefined;
}

function importSpecifierOf(node: ts.Node | undefined): ts.ImportSpecifier | undefined {
  let cur: ts.Node | undefined = node;
  while (cur) {
    if (ts.isImportSpecifier(cur)) return cur;
    if (ts.isImportDeclaration(cur)) return undefined;
    cur = cur.parent;
  }
  return undefined;
}

function recordNamedImport(
  spec: ts.ImportSpecifier,
  fromPackagePath: string,
  usedImports: Map<string, Set<string>>,
): void {
  const importDecl = importDeclarationOf(spec);
  if (!importDecl || !ts.isStringLiteral(importDecl.moduleSpecifier)) return;
  const specifier = importDecl.moduleSpecifier.text;
  if (!specifier.startsWith(".")) return;
  const fromPath = resolveRelativePath(fromPackagePath, specifier);
  const importedName = (spec.propertyName ?? spec.name).text;
  let set = usedImports.get(fromPath);
  if (!set) {
    set = new Set<string>();
    usedImports.set(fromPath, set);
  }
  set.add(importedName);
}

function collectIntraFileDeps(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  rootNodes: ts.Node[],
  rootNames: Set<string>,
  fromPackagePath?: string,
): { needed: Set<string>; usedImports: Map<string, Set<string>> } {
  const tops = getTopLevelDecls(sf);
  const topByName = new Map(tops.map((d) => [d.name, d]));
  const needed = new Set<string>();
  const usedImports = new Map<string, Set<string>>();

  function addDeclByName(name: string): void {
    if (needed.has(name) || rootNames.has(name)) return;
    const decl = topByName.get(name);
    if (!decl) return;
    needed.add(name);
    visit(decl.node);
  }

  function visit(n: ts.Node): void {
    ts.forEachChild(n, visit);
    if (!ts.isIdentifier(n)) return;
    const sym = checker.getSymbolAtLocation(n);

    if (fromPackagePath && sym) {
      for (const d of sym.declarations ?? []) {
        const spec = importSpecifierOf(d);
        if (spec) recordNamedImport(spec, fromPackagePath, usedImports);
      }
    }

    const valueDecl = sym?.valueDeclaration ?? sym?.declarations?.[0];
    if (!valueDecl) return;
    let cur: ts.Node | undefined = valueDecl;
    while (cur && cur.parent && cur.parent !== sf) {
      cur = cur.parent;
    }
    if (!cur || cur.parent !== sf) return;
    const info = tops.find((t) => t.node === cur);
    if (info) {
      addDeclByName(info.name);
    }
  }

  for (const root of rootNodes) {
    visit(root);
  }
  return { needed, usedImports };
}

function analyzeSource(
  source: string,
  fileName: string,
  namesToExtract: Set<string>,
  fromPackagePath?: string,
): {
  sf: ts.SourceFile;
  tops: TopLevelDecl[];
  intraFile: Set<string>;
  usedImports: Map<string, Set<string>>;
} {
  const sf = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const host = ts.createCompilerHost({});
  const origGet = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion) =>
    name === fileName ? sf : origGet(name, languageVersion);

  const program = ts.createProgram(
    [fileName],
    { target: ts.ScriptTarget.Latest },
    host,
  );
  const checker = program.getTypeChecker();

  const tops = getTopLevelDecls(sf);
  const exportRoots = tops.filter((t) =>
    t.isExport && namesToExtract.has(t.name)
  );
  const { needed: intraFile, usedImports } = collectIntraFileDeps(
    sf,
    checker,
    exportRoots.map((r) => r.node),
    namesToExtract,
    fromPackagePath,
  );

  return { sf, tops, intraFile, usedImports };
}

function sliceStartWithJsDoc(sf: ts.SourceFile, node: ts.Node): number {
  const declStart = node.getStart(sf);
  const tags = ts.getJSDocCommentsAndTags(node);
  if (tags.length > 0) {
    return Math.min(declStart, ...tags.map((t) => t.pos));
  }
  const ranges = ts.getLeadingCommentRanges(sf.text, declStart) ?? [];
  for (let i = ranges.length - 1; i >= 0; i--) {
    const text = sf.text.slice(ranges[i].pos, ranges[i].end);
    if (text.startsWith("/**")) {
      return ranges[i].pos;
    }
  }
  return declStart;
}

function sliceDeclaration(sf: ts.SourceFile, node: ts.Node): string {
  const start = sliceStartWithJsDoc(sf, node);
  const end = node.getEnd();
  let text = sf.text.slice(start, end);

  if (ts.canHaveModifiers(node)) {
    const exportMod = node.modifiers?.find((m) =>
      m.kind === ts.SyntaxKind.ExportKeyword
    );
    if (exportMod) {
      const relStart = exportMod.getStart(sf) - start;
      let relEnd = exportMod.getEnd() - start;
      // Remove horizontal whitespace left after "export" (e.g. " class" -> "class").
      while (relEnd < text.length && (text[relEnd] === " " || text[relEnd] === "\t")) {
        relEnd++;
      }
      text = text.slice(0, relStart) + text.slice(relEnd);
    }
  }

  return text.trimEnd();
}

export function extractFromSource(
  source: string,
  fileName: string,
  namesToExtract: Set<string>,
): string {
  const { sf, tops, intraFile } = analyzeSource(
    source,
    fileName,
    namesToExtract,
  );

  // Emit in source order: intra-file deps (private or exported) then selected exports.
  const parts: string[] = [];
  for (const t of tops) {
    if (intraFile.has(t.name) || (t.isExport && namesToExtract.has(t.name))) {
      parts.push(sliceDeclaration(sf, t.node));
    }
  }

  return parts.join("\n\n");
}

export async function fetchPackageSource(
  version: string,
  packagePath: string,
): Promise<string> {
  const url = jsrFileUrl(version, packagePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  return response.text();
}

export async function extractFromFile(
  version: string,
  packagePath: string,
  namesToExtract: Set<string>,
): Promise<string> {
  const source = await fetchPackageSource(version, packagePath);
  const fileName = packagePath.replace(/^\//, "").split("/").pop() ??
    "module.ts";
  return extractFromSource(source, fileName, namesToExtract);
}
