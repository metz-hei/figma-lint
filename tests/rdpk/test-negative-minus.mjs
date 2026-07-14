/** Smoke-test для паттерна negative-minus (дублирует src/rdpk/negative-minus.ts). */
const WRONG_MINUS_REGEX = /(?<![\d\p{L}])(?:-|−|—)(?=\d)/gu;

function check(text) {
  return [...text.matchAll(WRONG_MINUS_REGEX)];
}

function getFixedText(text, match) {
  return (
    text.slice(0, match.index) +
    "–" +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "-50", expect: true },
  { text: "-50 444", expect: true },
  { text: "-50%", expect: true },
  { text: "- 50", expect: false },
  { text: "— 50", expect: false },
  { text: "−50", expect: true },
  { text: "—50", expect: true },
  { text: "Баланс: -50 ₽", expect: true },
  { text: "–50", expect: false },
  { text: "–50 444", expect: false },
  { text: "–50%", expect: false },
  { text: "50-100", expect: false },
  { text: "2024-06-02", expect: false },
  { text: "50", expect: false },
  { text: "ММВ-7-11/477", expect: false },
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
  { text: "-50", fixed: "–50" },
  { text: "-50 444", fixed: "–50 444" },
  { text: "-50%", fixed: "–50%" },
  { text: "Баланс: -50 ₽", fixed: "Баланс: –50 ₽" },
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
