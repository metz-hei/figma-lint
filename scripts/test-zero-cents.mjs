/** Smoke-test для паттерна zero-cents (дублирует src/rules/zero-cents.ts). */
const ZERO_CENTS_REGEX = /,\s*0+\s*[₽$€¥]/g;

function check(text) {
  return [...text.matchAll(ZERO_CENTS_REGEX)];
}

const cases = [
  { text: "50,00 ₽", expect: true },
  { text: "1 250,00 ₽", expect: true },
  { text: "50,0 $", expect: true },
  { text: "50 ₽", expect: false },
  { text: "50,50 ₽", expect: false },
  { text: "Цена: 99,00€", expect: true },
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
