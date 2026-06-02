import ts from "typescript";
import { jsrFileUrl } from "./constants.ts";

export interface TopLevelDecl {
  name: string;
  node: ts.Node;
  isExport: boolean;
}

export function exportsToExtractForFile(
  packagePath: string,
  selectedExports: string[],
  exportsByPath: Map<string, string[]>,
): Set<string> {
  const fileExports = exportsByPath.get(packagePath) ?? [];
  const selectedInFile = selectedExports.filter((name) =>
    fileExports.includes(name)
  );
  if (selectedInFile.length > 0) {
    return new Set(selectedInFile);
  }
  return new Set(fileExports);
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

function collectIntraFileDeps(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  rootNodes: ts.Node[],
): Set<string> {
  const tops = getTopLevelDecls(sf);
  const topByName = new Map(tops.map((d) => [d.name, d]));
  const needed = new Set<string>();

  function addDeclByName(name: string): void {
    if (needed.has(name)) return;
    const decl = topByName.get(name);
    if (!decl || decl.isExport) return;
    needed.add(name);
    visit(decl.node);
  }

  function visit(n: ts.Node): void {
    ts.forEachChild(n, visit);
    if (!ts.isIdentifier(n)) return;
    const sym = checker.getSymbolAtLocation(n);
    const valueDecl = sym?.valueDeclaration ?? sym?.declarations?.[0];
    if (!valueDecl) return;
    let cur: ts.Node | undefined = valueDecl;
    while (cur && cur.parent && cur.parent !== sf) {
      cur = cur.parent;
    }
    if (!cur || cur.parent !== sf) return;
    const info = tops.find((t) => t.node === cur);
    if (info && !info.isExport) {
      addDeclByName(info.name);
    }
  }

  for (const root of rootNodes) {
    visit(root);
  }
  return needed;
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
  const privateNeeded = collectIntraFileDeps(
    sf,
    checker,
    exportRoots.map((r) => r.node),
  );

  const parts: string[] = [];
  for (const t of tops) {
    if (!t.isExport && privateNeeded.has(t.name)) {
      parts.push(sliceDeclaration(sf, t.node));
    }
  }
  for (const t of tops) {
    if (t.isExport && namesToExtract.has(t.name)) {
      parts.push(sliceDeclaration(sf, t.node));
    }
  }

  return parts.join("\n\n");
}

export async function extractFromFile(
  version: string,
  packagePath: string,
  namesToExtract: Set<string>,
): Promise<string> {
  const url = jsrFileUrl(version, packagePath);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const source = await response.text();
  const fileName = packagePath.replace(/^\//, "").split("/").pop() ??
    "module.ts";
  return extractFromSource(source, fileName, namesToExtract);
}
