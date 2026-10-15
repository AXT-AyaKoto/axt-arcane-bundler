import { runWizard } from "./src/main.ts";

try {
  await runWizard();
} catch (error) {
  if (error instanceof Error && error.name === "ExitPromptError") {
    process.exitCode = 0;
  } else {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
