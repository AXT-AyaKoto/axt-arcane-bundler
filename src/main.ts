import colors from "picocolors";
import { copyToClipboard } from "./clipboard.ts";
import { fetchExportsByPath } from "./exports.ts";
import { resolveModuleGraph } from "./graph.ts";
import { mergeTypeScriptSources } from "./merge.ts";
import { formatOutput } from "./output.ts";
import { runPrompts, type PromptContext } from "./wizard.ts";

export async function runWizard(context?: PromptContext): Promise<void> {
    const selection = await runPrompts(context);
    if (selection.selectedExports.length === 0) {
        console.log("No exports selected. Nothing copied.");
        return;
    }
    const version = selection.resolved.fetchVersion;
    const exportsByPath = await fetchExportsByPath(version);
    const paths = await resolveModuleGraph(selection);
    const merged = await mergeTypeScriptSources(
        version,
        paths,
        selection.selectedExports,
        selection.resolved.specifier,
        exportsByPath,
    );
    await copyToClipboard(formatOutput(merged, selection.outputFormat));
    const message = `Copied ${paths.length} module(s) to the clipboard (${selection.selectedExports.length} export(s) selected).`;
    console.log(colors.bgGreen(colors.black(message)));
}
