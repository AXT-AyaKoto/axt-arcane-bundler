import { Checkbox } from "jsr:@cliffy/prompt@1.0.0/checkbox";
import { Input } from "jsr:@cliffy/prompt@1.0.0/input";
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
}

export async function runPrompts(): Promise<WizardSelection> {
  const meta = await fetchPackageMeta();
  const hint = versionHint(meta);

  const versionInput = await Input.prompt({
    message: `version: ${hint}`,
    default: "",
  });

  const resolved = resolveArcane(
    meta,
    versionInput === "" ? undefined : versionInput,
  );

  const exportNames = await listExportNames(resolved.fetchVersion);

  const selectedExports = await Checkbox.prompt({
    message: "imports: ",
    options: exportNames,
    minOptions: 1,
    search: exportNames.length > 10,
  }) as string[];

  return { resolved, selectedExports };
}
