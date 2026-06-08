/** Smoke-test для паттерна punctuation-space (дублирует src/rules/punctuation-space.ts). */
const WS = "[ \\u00A0\\u202F\\t]+";
const PUNCT_REGEX = new RegExp(`(\\S)${WS}([!.?,;:\\u2026])`, "g");

function check(text) {
  return [...text.matchAll(PUNCT_REGEX)];
}

function getFixedText(text, match) {
  const char = match[1];
  const punct = match[2];
  return (
    text.slice(0, match.index) +
    `${char}${punct}` +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "Привет !", expect: true },
  { text: "слово , текст", expect: true },
  { text: "Конец .", expect: true },
  { text: "Зачем ?", expect: true },
  { text: "один ; два", expect: true },
  { text: "Примечание :", expect: true },
  { text: "далее …", expect: true },
  { text: "слово\u00A0,", expect: true },
  { text: "слово\u202F.", expect: true },
  { text: "Привет!", expect: false },
  { text: "слово, текст", expect: false },
  { text: "1 ,000", expect: true },
  { text: "50 ,00", expect: true },
  { text: "hello world", expect: false },
  { text: "без ошибок", expect: false },
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
  { text: "Привет !", fixed: "Привет!" },
  { text: "слово , текст", fixed: "слово, текст" },
  { text: "слово\u00A0,", fixed: "слово," },
  { text: "50 ,00", fixed: "50,00" },
  { text: "далее …", fixed: "далее…" },
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
