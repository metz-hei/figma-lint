import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const testsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "tests");

function collectTestFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectTestFiles(fullPath));
      continue;
    }
    if (entry.endsWith(".mjs")) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

const files = collectTestFiles(testsDir);

if (files.length === 0) {
  console.error("No test files found in tests/");
  process.exit(1);
}

let failed = 0;

for (const file of files) {
  const relative = file.slice(testsDir.length + 1);
  console.log(`\n▶ ${relative}\n`);

  const result = spawnSync(process.execPath, [file], {
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
