import { checkbox, search, select } from "@inquirer/prompts";
import { fetchPackageMeta, resolveArcane, versionChoices, type ResolvedArcane } from "./version.ts";
import { listExportNames } from "./exports.ts";
import type { OutputFormat } from "./output.ts";

export type PromptContext = Parameters<typeof search>[1];

export interface WizardSelection {
    resolved: ResolvedArcane;
    selectedExports: string[];
    outputFormat: OutputFormat;
}

export async function runPrompts(context?: PromptContext): Promise<WizardSelection> {
    const meta = await fetchPackageMeta();
    const choices = versionChoices(meta);
    const versionInput = await search(
        {
            message: "version:",
            source: (input) =>
                choices.filter((choice) => choice.name.toLowerCase().includes((input ?? "").trim().toLowerCase())),
        },
        context,
    );

    const resolved = resolveArcane(meta, versionInput || undefined);
    const exportNames = await listExportNames(resolved.fetchVersion);
    const selectedExports = await checkbox(
        {
            message: "imports:",
            choices: exportNames,
            required: false,
        },
        context,
    );

    const outputFormat =
        selectedExports.length === 0
            ? "typescript"
            : await select<OutputFormat>(
                  {
                      message: "output:",
                      choices: [
                          { name: "TypeScript", value: "typescript" },
                          { name: "JavaScript (strip types)", value: "javascript" },
                      ],
                      default: "typescript",
                  },
                  context,
              );

    return { resolved, selectedExports, outputFormat };
}
