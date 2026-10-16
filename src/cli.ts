#!/usr/bin/env node
import { styleText } from "node:util";
import { UserError } from "./errors.ts";
import { runWizard } from "./main.ts";

try {
  await runWizard();
} catch (error) {
  // Ctrl+C during a prompt
  if (error instanceof Error && error.name === "ExitPromptError") {
    process.exit(130);
  }
  if (error instanceof UserError) {
    console.error(styleText("red", `Error: ${error.message}`));
    process.exit(1);
  }
  throw error;
}
