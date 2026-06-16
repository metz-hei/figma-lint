/** Smoke-test для паттерна signed-amount (дублирует src/rdpk/signed-amount.ts). */
const SIGNED_CURRENCY_SPACE_REGEX =
  /(?<!\d)((?:\+|–|-|−)\s+)(\d+(?:[,\s]\d+)*\s?[₽$€¥£₸₼])/g;

function check(text) {
  return [...text.matchAll(SIGNED_CURRENCY_SPACE_REGEX)];
}

function getFixedText(text, match) {
  const sign = match[1].trim();
  const amount = match[2];
  const replacementSign = sign === "+" ? "+" : "–";
  return (
    text.slice(0, match.index) +
    `${replacementSign}${amount}` +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "+ 50 ₽", expect: true },
  { text: "– 50 ₽", expect: true },
  { text: "- 50 ₽", expect: true },
  { text: "− 50 ₽", expect: true },
  { text: "+ 1 000 ₽", expect: true },
  { text: "+ 50₽", expect: true },
  { text: "– 100 $", expect: true },
  { text: "+50 ₽", expect: false },
  { text: "–50 ₽", expect: false },
  { text: "-50 ₽", expect: false },
  { text: "Скидка — 50 ₽", expect: false },
  { text: "— 50 ₽", expect: false },
  { text: "+ 50%", expect: false },
  { text: "– 50%", expect: false },
  { text: "+ 50", expect: false },
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
  { text: "+ 50 ₽", fixed: "+50 ₽" },
  { text: "– 50 ₽", fixed: "–50 ₽" },
  { text: "- 50 ₽", fixed: "–50 ₽" },
  { text: "+ 1 000 ₽", fixed: "+1 000 ₽" },
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
