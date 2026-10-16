import { spawn, spawnSync } from "node:child_process";

function pipeToClipboardCommand(
  command: string,
  args: string[],
  text: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "ignore", "inherit"],
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to copy to clipboard (${command}).`));
      }
    });
    child.stdin.end(text);
  });
}

function writeToStdoutFallback(text: string): void {
  console.warn(
    "Warning: No clipboard utility found. Writing bundled source to stdout.",
  );
  process.stdout.write(text);
}

function commandExists(command: string): boolean {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (process.platform === "darwin") {
    await pipeToClipboardCommand("pbcopy", [], text);
    return;
  }

  if (process.platform === "win32") {
    try {
      await pipeToClipboardCommand("clip", [], text);
      return;
    } catch {
      writeToStdoutFallback(text);
      return;
    }
  }

  for (const cmd of ["wl-copy", "xclip", "xsel"]) {
    try {
      if (!commandExists(cmd)) continue;

      const args = cmd === "xclip"
        ? ["-selection", "clipboard"]
        : cmd === "xsel"
        ? ["--clipboard", "--input"]
        : [];

      await pipeToClipboardCommand(cmd, args, text);
      return;
    } catch {
      // try next
    }
  }

  writeToStdoutFallback(text);
}
