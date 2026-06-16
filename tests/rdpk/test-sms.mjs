/** Smoke-test для паттерна sms (дублирует src/rdpk/sms.ts). */
const SMS_REGEX = /\b(?:sms)\b|(?:смс)/gi;

const SMS_SUGGESTION = "СМС";

function check(text) {
  const hits = [];
  for (const match of text.matchAll(SMS_REGEX)) {
    if (match[0] === SMS_SUGGESTION) continue;
    hits.push(match);
  }
  return hits;
}

const cases = [
  { text: "sms", expect: true },
  { text: "SMS", expect: true },
  { text: "Sms", expect: true },
  { text: "смс", expect: true },
  { text: "Смс", expect: true },
  { text: "сМс", expect: true },
  { text: "СМС", expect: false },
  { text: "Отправим СМС", expect: false },
  { text: "Укажите sms-код", expect: true },
  { text: "mysms", expect: false },
  { text: "smsing", expect: false },
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
  { text: "sms", fixed: "СМС" },
  { text: "SMS", fixed: "СМС" },
  { text: "смс", fixed: "СМС" },
  { text: "Смс", fixed: "СМС" },
  { text: "Отправим sms", fixed: "Отправим СМС" },
  { text: "СМС", fixed: "СМС" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (text === "СМС" && hits.length !== 0) {
    console.error(`FAIL fix: "${text}" → should not match`);
    process.exit(1);
  }
  if (text !== "СМС" && hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  if (text === "СМС") {
    console.log(`ok fix: "${text}" → unchanged`);
    continue;
  }
  const got =
    text.slice(0, hits[0].index) +
    SMS_SUGGESTION +
    text.slice(hits[0].index + hits[0][0].length);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
