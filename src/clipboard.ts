import { spawn } from "node:child_process";

async function pipeToClipboardCommand(command: string, args: string[], text: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { stdio: ["pipe", "ignore", "inherit"] });
        child.on("error", reject);
        // Commands can close stdin before all input has been written (EPIPE).
        child.stdin.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Failed to copy to clipboard (${command}).`));
        });
        child.stdin.end(text, "utf8");
    });
}

async function writeToStdoutFallback(text: string): Promise<void> {
    console.warn("Warning: No clipboard utility found. Writing bundled source to stdout.");
    await new Promise<void>((resolve, reject) => {
        process.stdout.write(text, (error) => (error ? reject(error) : resolve()));
    });
}

export async function copyToClipboard(text: string): Promise<void> {
    if (process.platform === "darwin") {
        await pipeToClipboardCommand("pbcopy", [], text);
        return;
    }

    if (process.platform === "win32") {
        try {
            await pipeToClipboardCommand("clip", [], text);
        } catch {
            await writeToStdoutFallback(text);
        }
        return;
    }

    for (const command of ["wl-copy", "xclip", "xsel"]) {
        const args =
            command === "xclip" ? ["-selection", "clipboard"] : command === "xsel" ? ["--clipboard", "--input"] : [];
        try {
            await pipeToClipboardCommand(command, args, text);
            return;
        } catch {
            // Try the next available clipboard utility.
        }
    }
    await writeToStdoutFallback(text);
}
