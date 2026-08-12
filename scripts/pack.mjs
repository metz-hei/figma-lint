import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const out = `figma-lint-${version}.zip`;

rmSync(out, { force: true });
execFileSync("zip", ["-r", out, "dist"], { stdio: "inherit" });
console.log(`Packed ${out}`);
