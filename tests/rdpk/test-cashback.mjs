/** Smoke-test для паттерна cashback (дублирует src/rdpk/cashback.ts). */
const CASHBACK_WRONG_REGEX = /к(?:эшб[еэ]к|ешбек)[а-яё]*/gi;

const CORRECT_STEM = "кешбэк";

function cashbackReplacement(match) {
  const lower = match.toLocaleLowerCase("ru");
  const suffixMatch = lower.match(/^к(?:эшб[еэ]к|ешбек)([а-яё]*)$/);
  const suffix = suffixMatch?.[1] ?? "";
  const corrected = CORRECT_STEM + suffix;
  if (match[0] === match[0].toUpperCase()) {
    return corrected[0].toUpperCase() + corrected.slice(1);
  }
  return corrected;
}

function check(text) {
  const hits = [];
  for (const match of text.matchAll(CASHBACK_WRONG_REGEX)) {
    hits.push(match);
  }
  return hits;
}

const cases = [
  { text: "кэшбэк", expect: true },
  { text: "Кэшбэк", expect: true },
  { text: "кешбек", expect: true },
  { text: "Кешбек", expect: true },
  { text: "кэшбэка", expect: true },
  { text: "кешбека", expect: true },
  { text: "кешбэк", expect: false },
  { text: "Кешбэк", expect: false },
  { text: "кешбэка", expect: false },
  { text: "кешбэку", expect: false },
  { text: "кешбэком", expect: false },
];

let failed = 0;

for (const { text, expect } of cases) {
  const hits = check(text);
  const got = hits.length > 0;
  if (got !== expect) {
    console.error(`FAIL: "${text}" → expected ${expect}, got ${got}`, hits);
    failed++;
  } else {
    console.log(`ok: "${text}"`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);

const fixCases = [
  { text: "Кешбек", fixed: "Кешбэк" },
  { text: "Кэшбэк", fixed: "Кешбэк" },
  { text: "кэшбэка", fixed: "кешбэка" },
  { text: "кешбека", fixed: "кешбэка" },
  { text: "Кешбэк", fixed: "Кешбэк" },
  { text: "Начислим кэшбэк завтра", fixed: "Начислим кешбэк завтра" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (text === "Кешбэк" && hits.length !== 0) {
    console.error(`FAIL fix: "${text}" → should not match`);
    process.exit(1);
  }
  if (text !== "Кешбэк" && hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  if (text === "Кешбэк") {
    console.log(`ok fix: "${text}" → unchanged`);
    continue;
  }
  const got =
    text.slice(0, hits[0].index) +
    cashbackReplacement(hits[0][0]) +
    text.slice(hits[0].index + hits[0][0].length);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
