/** Smoke-test для буквы «ё» (дублирует src/spell/yo.ts и src/rdpk/yo-letter.ts). */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCustomWords } from "../../src/spell/custom-words-parse.mjs";

const yoWordsPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../src/spell/yo-words.txt",
);

function expandCanonicalForms(parsed) {
  const forms = [];

  for (const word of parsed.exact) {
    forms.push(word);
  }

  for (const [base, suffixes] of parsed.stems) {
    for (const suffix of suffixes) {
      forms.push(base + suffix);
    }
  }

  return forms;
}

function toEForm(word) {
  return word.toLocaleLowerCase("ru").replace(/ё/g, "е");
}

function buildEFormIndex(parsed) {
  const index = new Map();

  for (const canonical of expandCanonicalForms(parsed)) {
    index.set(toEForm(canonical), canonical.toLocaleLowerCase("ru"));
  }

  return index;
}

const E_FORM_INDEX = buildEFormIndex(
  parseCustomWords(readFileSync(yoWordsPath, "utf8")),
);

function restoreCase(original, canonical) {
  if (original[0] === original[0].toLocaleUpperCase("ru")) {
    return canonical[0].toLocaleUpperCase("ru") + canonical.slice(1);
  }
  return canonical;
}

function yoReplacement(word) {
  const lower = word.toLocaleLowerCase("ru");
  const canonical = E_FORM_INDEX.get(toEForm(word));
  if (!canonical || lower === canonical) return null;
  return restoreCase(word, canonical);
}

const WORD_REGEX =
  /[а-яёА-ЯЁ]+(?:-[а-яёА-ЯЁ]+)*|[a-zA-Z]+(?:'[a-zA-Z]+)*/g;

function check(text) {
  const hits = [];

  for (const match of text.matchAll(WORD_REGEX)) {
    if (match.index === undefined) continue;
    if (!/[а-яёА-ЯЁ]/.test(match[0])) continue;

    const replacement = yoReplacement(match[0]);
    if (!replacement) continue;

    hits.push({ word: match[0], index: match.index, replacement });
  }

  return hits;
}

const cases = [
  { text: "еще раз", expect: true, word: "еще", replacement: "ещё" },
  { text: "Еще раз", expect: true, word: "Еще", replacement: "Ещё" },
  { text: "ещё раз", expect: false },
  { text: "елка в саду", expect: true, word: "елка", replacement: "ёлка" },
  { text: "ёлка в саду", expect: false },
  { text: "черная кнопка", expect: true, word: "черная", replacement: "чёрная" },
  { text: "чёрная кнопка", expect: false },
  { text: "объем файла", expect: true, word: "объем", replacement: "объём" },
  { text: "объём файла", expect: false },
  { text: "идет загрузка", expect: true, word: "идет", replacement: "идёт" },
  { text: "идёт загрузка", expect: false },
  { text: "отчета за месяц", expect: true, word: "отчета", replacement: "отчёта" },
  { text: "отчёта за месяц", expect: false },
  { text: "все пользователи", expect: false },
  { text: "легкий способ", expect: false },
  { text: "API endpoint", expect: false },
];

let failed = 0;

for (const { text, expect, word, replacement } of cases) {
  const hits = check(text);
  const got = hits.length > 0;

  if (got !== expect) {
    console.error(`FAIL: "${text}" → expected ${expect}, got ${got}`, hits);
    failed++;
    continue;
  }

  if (expect && (hits[0].word !== word || hits[0].replacement !== replacement)) {
    console.error(
      `FAIL: "${text}" → expected ${word}→${replacement}, got ${hits[0].word}→${hits[0].replacement}`,
    );
    failed++;
    continue;
  }

  console.log(`ok: "${text}"`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);

const fixCases = [
  { text: "еще раз", fixed: "ещё раз" },
  { text: "Еще раз", fixed: "Ещё раз" },
  { text: "черная кнопка", fixed: "чёрная кнопка" },
  { text: "отчета за месяц", fixed: "отчёта за месяц" },
  { text: "ещё раз", fixed: "ещё раз" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);

  if (fixed === text && hits.length !== 0) {
    console.error(`FAIL fix: "${text}" → should not match`);
    process.exit(1);
  }

  if (fixed !== text && hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }

  if (fixed === text) {
    console.log(`ok fix: "${text}" → unchanged`);
    continue;
  }

  const hit = hits[0];
  const got =
    text.slice(0, hit.index) +
    hit.replacement +
    text.slice(hit.index + hit.word.length);

  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }

  console.log(`ok fix: "${text}" → "${got}"`);
}
