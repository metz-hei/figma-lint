/** Smoke-test для паттерна preposition-nbsp (дублирует src/rdpk/preposition-nbsp.ts). */
const NBSP = "\u00A0";

const PARTICLES = [
  "во",
  "ко",
  "со",
  "об",
  "от",
  "до",
  "из",
  "за",
  "на",
  "по",
  "но",
  "да",
  "ни",
  "в",
  "к",
  "с",
  "у",
  "о",
  "а",
  "и",
];

const PARTICLE_RE = new RegExp(
  `(?<![а-яёА-ЯЁa-zA-Z0-9_])(${PARTICLES.join("|")})([ \\u202F]+)(?=[а-яёА-ЯЁa-zA-Z0-9])`,
  "gi",
);

function isAbbreviationAfterI(text, nextIndex) {
  return /^т\.\s*[дп]\.|^др\.|^пр\./i.test(text.slice(nextIndex));
}

function check(text) {
  const issues = [];
  for (const match of text.matchAll(PARTICLE_RE)) {
    if (match.index === undefined) continue;
    const particle = match[1];
    const nextIndex = match.index + match[0].length;
    if (
      particle.toLocaleLowerCase("ru") === "и" &&
      isAbbreviationAfterI(text, nextIndex)
    ) {
      continue;
    }
    issues.push({
      match: match[0],
      replacement: `${particle}${NBSP}`,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return issues;
}

function getFixedText(text, issue) {
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}

const cases = [
  { text: "в дом", expect: true },
  { text: "И так", expect: true },
  { text: "к 5", expect: true },
  { text: "на счет", expect: true },
  { text: "во дворе", expect: true },
  { text: "но потом", expect: true },
  { text: "чтобы всё", expect: false },
  { text: "через час", expect: false },
  { text: "не забудь", expect: false },
  { text: "для вас", expect: false },
  { text: `в${NBSP}дом`, expect: false },
  { text: "непонятно", expect: false },
  { text: "и т.д.", expect: false },
  { text: "и т.п.", expect: false },
  { text: "и др.", expect: false },
  { text: "и пр.", expect: false },
  { text: "без ошибок в тексте", expect: true }, // только «в»
  { text: "просто текст", expect: false },
  { text: "а\u202Fб", expect: true },
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
  { text: "в дом", fixed: `в${NBSP}дом` },
  { text: "И так далее", fixed: `И${NBSP}так далее` },
  { text: "к 5 рублям", fixed: `к${NBSP}5 рублям` },
  { text: "а\u202Fб", fixed: `а${NBSP}б` },
  { text: "по дому и саду", fixed: `по${NBSP}дому и саду` },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (hits.length === 0) {
    console.error(`FAIL fix: "${text}" → expected hits`);
    process.exit(1);
  }
  const got = getFixedText(text, hits[0]);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}

{
  const text = "по дому и саду";
  const first = check(text)[0];
  const afterFirst = getFixedText(text, first);
  const second = check(afterFirst)[0];
  const afterSecond = getFixedText(afterFirst, second);
  const expected = `по${NBSP}дому и${NBSP}саду`;
  if (afterSecond !== expected) {
    console.error(`FAIL multi-fix: expected "${expected}", got "${afterSecond}"`);
    process.exit(1);
  }
  console.log(`ok multi-fix: "${text}" → "${afterSecond}"`);
}
