import { checkbox, input, select } from "@inquirer/prompts";
import type { OutputLanguage } from "./strip.ts";
import {
  fetchPackageMeta,
  resolveArcane,
  versionHint,
  type ResolvedArcane,
} from "./version.ts";
import { listExportNames } from "./exports.ts";

export interface WizardSelection {
  resolved: ResolvedArcane;
  selectedExports: string[];
  language: OutputLanguage;
}

export async function runPrompts(): Promise<WizardSelection> {
  const meta = await fetchPackageMeta();
  const hint = versionHint(meta);

  const versionInput = await input({
    message: `version: ${hint}`,
    default: "",
  });

  const resolved = resolveArcane(
    meta,
    versionInput === "" ? undefined : versionInput,
  );

  const exportNames = await listExportNames(resolved.fetchVersion);

  const selectedExports = await checkbox({
    message: "imports: ",
    choices: exportNames,
    required: true,
    pageSize: 15,
    loop: false,
  });

  const language = await select<OutputLanguage>({
    message: "language: ",
    choices: [
      { name: "TypeScript", value: "typescript" },
      { name: "JavaScript (type-stripped)", value: "javascript" },
    ],
    default: "typescript",
  });

  return { resolved, selectedExports, language };
}
