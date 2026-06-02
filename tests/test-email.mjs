/** Smoke-test для паттерна email (дублирует src/rules/email.ts). */
const EMAIL_REGEX = /\b(?:e-?mail)\b/gi;

function emailReplacement(match) {
  const isSentenceCase =
    match[0] === match[0].toUpperCase() &&
    match.slice(1) === match.slice(1).toLowerCase();

  if (isSentenceCase) {
    return "Имейл или электронная почта";
  }

  return "имейл или электронная почта";
}

function check(text) {
  return [...text.matchAll(EMAIL_REGEX)];
}

const cases = [
  { text: "email", expect: true },
  { text: "Email", expect: true },
  { text: "EMAIL", expect: true },
  { text: "e-mail", expect: true },
  { text: "E-mail", expect: true },
  { text: "E-MAIL", expect: true },
  { text: "Укажите email", expect: true },
  { text: "Email: test@example.com", expect: true },
  { text: "имейл", expect: false },
  { text: "Имейл", expect: false },
  { text: "электронная почта", expect: false },
  { text: "myemail", expect: false },
  { text: "emailing", expect: false },
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
  { text: "email", fixed: "имейл или электронная почта" },
  { text: "Email", fixed: "Имейл или электронная почта" },
  { text: "EMAIL", fixed: "имейл или электронная почта" },
  { text: "e-mail", fixed: "имейл или электронная почта" },
  { text: "E-mail", fixed: "Имейл или электронная почта" },
  { text: "Укажите email", fixed: "Укажите имейл или электронная почта" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  const got =
    text.slice(0, hits[0].index) +
    emailReplacement(hits[0][0]) +
    text.slice(hits[0].index + hits[0][0].length);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
