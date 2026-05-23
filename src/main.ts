import { bgGreen, black } from "@std/fmt/colors";
import { copyToClipboard } from "./clipboard.ts";
import { resolveModuleGraph } from "./graph.ts";
import { mergeTypeScriptSources } from "./merge.ts";
import { runPrompts } from "./wizard.ts";

export async function runWizard(): Promise<void> {
  const selection = await runPrompts();
  const paths = await resolveModuleGraph(selection);
  const merged = await mergeTypeScriptSources(
    selection.resolved.fetchVersion,
    paths,
    selection.selectedExports,
    selection.resolved.specifier,
  );
  await copyToClipboard(merged);
  const message =
    `Copied ${paths.length} module(s) to the clipboard (${selection.selectedExports.length} export(s) selected).`;
  console.log(bgGreen(black(message)));
}
