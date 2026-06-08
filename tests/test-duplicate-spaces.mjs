/** Smoke-test для паттерна duplicate-spaces (дублирует src/rules/duplicate-spaces.ts). */
const DUPLICATE_SPACES_REGEX = /[ \u00A0\u202F\t]{2,}/g;

function check(text) {
  return [...text.matchAll(DUPLICATE_SPACES_REGEX)];
}

function getFixedText(text, match) {
  return (
    text.slice(0, match.index) +
    " " +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "hello  world", expect: true },
  { text: "hello   world", expect: true },
  { text: "hello world", expect: false },
  { text: "a\u00A0\u00A0b", expect: true },
  { text: "a\u202F\u202Fb", expect: true },
  { text: "a \u00A0b", expect: true },
  { text: "a\t\tb", expect: true },
  { text: "один  два  три", expect: true },
  { text: "без ошибок", expect: false },
  { text: "перенос\n\nстроки", expect: false },
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
  { text: "hello  world", fixed: "hello world" },
  { text: "a\u00A0\u00A0b", fixed: "a b" },
  { text: "один  два  три", fixed: "один два три" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (hits.length === 0) {
    console.error(`FAIL fix: "${text}" → expected hits`);
    process.exit(1);
  }
  let got = text;
  for (let i = hits.length - 1; i >= 0; i--) {
    got = getFixedText(got, hits[i]);
  }
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
