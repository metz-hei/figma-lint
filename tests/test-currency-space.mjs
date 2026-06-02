/** Smoke-test для паттерна currency-space (дублирует src/rules/currency-space.ts). */
const CURRENCY_SPACE_REGEX = /\d[₽$€¥£₸₼]/g;

function check(text) {
  return [...text.matchAll(CURRENCY_SPACE_REGEX)];
}

function getFixedText(text, match) {
  const digit = match[0][0];
  const currency = match[0].slice(1);
  return (
    text.slice(0, match.index) +
    `${digit} ${currency}` +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "50₽", expect: true },
  { text: "99€", expect: true },
  { text: "100$", expect: true },
  { text: "100¥", expect: true },
  { text: "50£", expect: true },
  { text: "1000₸", expect: true },
  { text: "25₼", expect: true },
  { text: "50,50₽", expect: true },
  { text: "Цена: 50₽", expect: true },
  { text: "50 ₽", expect: false },
  { text: "99,00 €", expect: false },
  { text: "100 ¥", expect: false },
  { text: "50,50 ₽", expect: false },
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
  { text: "50₽", fixed: "50 ₽" },
  { text: "99€", fixed: "99 €" },
  { text: "100¥", fixed: "100 ¥" },
  { text: "50,50₽", fixed: "50,50 ₽" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  const got = getFixedText(text, hits[0]);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
