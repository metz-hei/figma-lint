/** Smoke-test для паттерна multiplication-sign (дублирует src/rules/multiplication-sign.ts). */
const WRONG_MULTIPLY_REGEX = /(\d+)\s*(?:[хХ*]|\s×|×\s)\s*(\d+)/g;

function check(text) {
  return [...text.matchAll(WRONG_MULTIPLY_REGEX)];
}

function getFixedText(text, match) {
  const fixed = `${match[1]}×${match[2]}`;
  return (
    text.slice(0, match.index) +
    fixed +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "50х50", expect: true },
  { text: "50Х50", expect: true },
  { text: "50 х 50", expect: true },
  { text: "50*50", expect: true },
  { text: "50 × 50", expect: true },
  { text: "50× 50", expect: true },
  { text: "50 ×50", expect: true },
  { text: "50×50", expect: false },
  { text: "Размер 50х50 см", expect: true },
  { text: "30*40 и 50х50", expect: true, hits: 2 },
  { text: "50–100", expect: false },
  { text: "50", expect: false },
];

let failed = 0;

for (const { text, expect, hits: expectedHits } of cases) {
  const matches = check(text);
  const got = matches.length > 0;
  if (got !== expect) {
    console.error(`FAIL: "${text}" → expected ${expect}, got ${got}`, matches);
    failed++;
    continue;
  }
  if (expectedHits !== undefined && matches.length !== expectedHits) {
    console.error(
      `FAIL: "${text}" → expected ${expectedHits} hits, got ${matches.length}`,
      matches,
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
  { text: "50х50", fixed: "50×50" },
  { text: "50Х50", fixed: "50×50" },
  { text: "50 х 50", fixed: "50×50" },
  { text: "50*50", fixed: "50×50" },
  { text: "50 × 50", fixed: "50×50" },
  { text: "Размер 50х50 см", fixed: "Размер 50×50 см" },
];

for (const { text, fixed } of fixCases) {
  const matches = check(text);
  if (matches.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${matches.length}`);
    process.exit(1);
  }
  const got = getFixedText(text, matches[0]);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
