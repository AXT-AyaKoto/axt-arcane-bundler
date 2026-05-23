const COMPILE_PERMISSIONS = [
  "--allow-net",
  "--allow-read",
  "--allow-run",
] as const;

const TARGETS = [
  {
    fileName: "axt-arcane-bundler-aarch64-apple-darwin",
    target: "aarch64-apple-darwin",
    label: "macOS (Apple Silicon)",
  },
  {
    fileName: "axt-arcane-bundler-x86_64-pc-windows-msvc.exe",
    target: "x86_64-pc-windows-msvc",
    label: "Windows (x86_64)",
  },
  {
    fileName: "axt-arcane-bundler-x86_64-unknown-linux-gnu",
    target: "x86_64-unknown-linux-gnu",
    label: "Linux (x86_64)",
  },
] as const;

const OUT_DIR = "dist";
const ENTRY = "exec.ts";

if (import.meta.main) {
  await Deno.mkdir(OUT_DIR, { recursive: true });

  for (const { fileName, target, label } of TARGETS) {
    const output = `${OUT_DIR}/${fileName}`;
    console.log(`\nBuilding ${label} -> ${output}`);

    const command = new Deno.Command(Deno.execPath(), {
      args: [
        "compile",
        ...COMPILE_PERMISSIONS,
        "--target",
        target,
        "--output",
        output,
        ENTRY,
      ],
      stdout: "inherit",
      stderr: "inherit",
    });

    const status = await command.output();
    if (!status.success) {
      console.error(`Failed to compile for ${target}.`);
      Deno.exit(1);
    }
  }

  console.log(`\nDone. Binaries are in ./${OUT_DIR}/`);
}
