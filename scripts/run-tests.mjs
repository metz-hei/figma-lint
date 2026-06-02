import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "tests");

const files = readdirSync(testsDir)
  .filter((file) => file.endsWith(".mjs"))
  .sort();

if (files.length === 0) {
  console.error("No test files found in tests/");
  process.exit(1);
}

let failed = 0;

for (const file of files) {
  console.log(`\n▶ ${file}\n`);

  const result = spawnSync(process.execPath, [join(testsDir, file)], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    failed++;
  }
}

console.log(`\n${files.length - failed}/${files.length} test files passed`);

if (failed > 0) {
  process.exit(1);
}
