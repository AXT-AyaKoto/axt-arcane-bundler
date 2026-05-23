async function pipeToClipboardCommand(
  command: string,
  args: string[],
  text: string,
): Promise<void> {
  const proc = new Deno.Command(command, {
    args,
    stdin: "piped",
    stdout: "null",
    stderr: "inherit",
  });
  const child = proc.spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(text));
  await writer.close();
  const status = await child.status;
  if (!status.success) {
    throw new Error(`Failed to copy to clipboard (${command}).`);
  }
}

async function writeToStdoutFallback(text: string): Promise<void> {
  console.warn(
    "Warning: No clipboard utility found. Writing bundled source to stdout.",
  );
  await Deno.stdout.write(new TextEncoder().encode(text));
}

export async function copyToClipboard(text: string): Promise<void> {
  if (Deno.build.os === "darwin") {
    await pipeToClipboardCommand("pbcopy", [], text);
    return;
  }

  if (Deno.build.os === "windows") {
    try {
      await pipeToClipboardCommand("clip", [], text);
      return;
    } catch {
      await writeToStdoutFallback(text);
      return;
    }
  }

  for (const cmd of ["wl-copy", "xclip", "xsel"]) {
    try {
      const check = new Deno.Command("which", {
        args: [cmd],
        stdout: "null",
        stderr: "null",
      });
      const checkStatus = await check.output();
      if (!checkStatus.success) continue;

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

  await writeToStdoutFallback(text);
}
