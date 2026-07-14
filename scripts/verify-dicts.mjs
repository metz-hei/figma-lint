import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bundlePath = join(root, "dist/code.js");

function parseEmbeddedString(bundle, varName) {
  const marker = `var ${varName}_default = `;
  const start = bundle.indexOf(marker);
  if (start < 0) {
    throw new Error(`В dist/code.js нет ${varName}_default`);
  }

  let i = start + marker.length;
  if (bundle[i] !== '"') {
    throw new Error(`${varName}_default не строковый литерал`);
  }
  i++;

  let result = "";
  while (i < bundle.length) {
    const char = bundle[i];
    if (char === '"') {
      return result;
    }

    if (char !== "\\") {
      result += char;
      i++;
      continue;
    }

    const esc = bundle[++i];
    if (esc === "n") {
      result += "\n";
      i++;
      continue;
    }
    if (esc === "u") {
      result += String.fromCodePoint(parseInt(bundle.slice(i + 1, i + 5), 16));
      i += 5;
      continue;
    }
    if (esc === "x") {
      result += String.fromCodePoint(parseInt(bundle.slice(i + 1, i + 3), 16));
      i += 3;
      continue;
    }

    result += esc;
    i++;
  }

  throw new Error(`Незакрытая строка ${varName}_default`);
}

function verifyDict(name, raw, bundled) {
  if (raw !== bundled) {
    console.error(`FAIL: ${name} — содержимое в dist/code.js не совпадает с исходником`);
    return false;
  }

  return true;
}

const bundle = readFileSync(bundlePath, "utf8");
const customWords = readFileSync(
  join(root, "src/spell/custom-words.txt"),
  "utf8",
);
const yoWords = readFileSync(join(root, "src/spell/yo-words.txt"), "utf8");

let ok = true;
ok =
  verifyDict(
    "custom-words.txt",
    customWords,
    parseEmbeddedString(bundle, "custom_words"),
  ) && ok;
ok =
  verifyDict(
    "yo-words.txt",
    yoWords,
    parseEmbeddedString(bundle, "yo_words"),
  ) && ok;

if (!ok) {
  process.exit(1);
}
