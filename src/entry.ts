import { join } from "@std/path";

const ENTRY_BASENAME = "axt-arcane-bundler-entry.ts";

export interface EntryFile {
  path: string;
  specifier: string;
}

export function buildEntrySource(
  specifier: string,
  exportNames: string[],
): string {
  const sorted = [...exportNames].sort((a, b) => a.localeCompare(b));
  const names = sorted.join(",\n  ");
  return `export {\n  ${names},\n} from "${specifier}";\n`;
}

export async function writeEntryFile(
  specifier: string,
  exportNames: string[],
): Promise<EntryFile> {
  const dir = await Deno.makeTempDir({ prefix: "axt-arcane-bundler-" });
  const path = join(dir, ENTRY_BASENAME);
  const source = buildEntrySource(specifier, exportNames);
  await Deno.writeTextFile(path, source);
  return { path, specifier };
}
