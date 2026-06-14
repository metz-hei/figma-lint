/** Smoke-test для паттерна incomplete-cents (дублирует src/rdpk/incomplete-cents.ts). */
const INCOMPLETE_CENTS_REGEX =
  /(\d[\d\s]*),([1-9])(?!\d)(\s*[₽$€¥£₸₼])/g;

function check(text) {
  return [...text.matchAll(INCOMPLETE_CENTS_REGEX)];
}

function getFixed(match) {
  const [, integerPart, centDigit, currencyPart] = match;
  return `${integerPart},${centDigit}0${currencyPart}`;
}

const cases = [
  { text: "40,4 ₽", expect: true },
  { text: "1 250,5 ₽", expect: true },
  { text: "50,9 $", expect: true },
  { text: "99,1£", expect: true },
  { text: "100,3 ₸", expect: true },
  { text: "25,7 ₼", expect: true },
  { text: "50,50 ₽", expect: false },
  { text: "50,00 ₽", expect: false },
  { text: "50,0 ₽", expect: false },
  { text: "50 ₽", expect: false },
  { text: "Цена: 12,4€", expect: true },
  { text: "100¥", expect: false },
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
  { text: "40,4 ₽", fixed: "40,40 ₽" },
  { text: "1 250,5 ₽", fixed: "1 250,50 ₽" },
  { text: "99,1£", fixed: "99,10£" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  const got = getFixed(hits[0]);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
