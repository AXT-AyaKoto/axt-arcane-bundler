import {
  extractFromFile,
  exportsToExtractForFile,
} from "./extract.ts";

export function normalizeBlankLines(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n");
}

export async function mergeTypeScriptSources(
  fetchVersion: string,
  packagePaths: string[],
  selectedExports: string[],
  specifier: string,
  exportsByPath: Map<string, string[]>,
): Promise<string> {
  const parts: string[] = [
    "// ======== Bundled from AyaExpTech Arcane ========",
    `// Package: ${specifier}`,
    `// Resolved version (sources): ${fetchVersion}`,
    `// Selected exports: ${selectedExports.join(", ")}`,
    "",
  ];

  for (const pkgPath of packagePaths) {
    const namesToExtract = exportsToExtractForFile(
      pkgPath,
      selectedExports,
      exportsByPath,
    );
    if (namesToExtract.size === 0) continue;

    const chunk = await extractFromFile(
      fetchVersion,
      pkgPath,
      namesToExtract,
    );
    if (chunk.length > 0) {
      parts.push(chunk, "");
    }
  }

  parts.push("// ======== Bundled from AyaExpTech Arcane (End) ========");

  const merged = parts.join("\n").trimEnd() + "\n";
  return normalizeBlankLines(merged);
}
