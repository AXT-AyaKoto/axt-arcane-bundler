import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const targets = [
    ["bun-darwin-arm64", "axt-arcane-bundler-aarch64-apple-darwin"],
    ["bun-windows-x64", "axt-arcane-bundler-x86_64-pc-windows-msvc.exe"],
    ["bun-linux-x64", "axt-arcane-bundler-x86_64-unknown-linux-gnu"],
];
await mkdir("dist", { recursive: true });
for (const [target, fileName] of targets) {
    console.log(`Building ${target} -> dist/${fileName}`);
    const result = spawnSync(
        "bun",
        [
            "build",
            "--compile",
            "--no-compile-autoload-dotenv",
            "--no-compile-autoload-bunfig",
            `--target=${target}`,
            "--outfile",
            `dist/${fileName}`,
            "exec.ts",
        ],
        { stdio: "inherit" },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
}
