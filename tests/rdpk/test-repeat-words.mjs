/** Smoke-test для repeat-words (дублирует src/rdpk/repeat-words.ts). */
const WORD_REGEX =
  /[а-яёА-ЯЁ]+(?:-[а-яёА-ЯЁ]+)*|[a-zA-Z]+(?:'[a-zA-Z]+)*/g;

const URL_REGEX = /^https?:\/\//i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_TEXT_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_IN_TEXT_REGEX = /https?:\/\/[^\s]+/gi;
const PLACEHOLDER_REGEX = /^(?:\{\{[^}]+\}\}|%[sd]|%\d+\$[sd]|\{[0-9]+\})$/;
const HAS_DIGIT_REGEX = /\d/;

function isInsideSpan(text, start, end, regex) {
  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) continue;

    const spanStart = match.index;
    const spanEnd = spanStart + match[0].length;
    if (start >= spanStart && end <= spanEnd) return true;
  }

  return false;
}

function shouldSkipRepeatToken(word, text, start, end) {
  if (word.length < 2) return true;
  if (/^\d+$/.test(word)) return true;
  if (URL_REGEX.test(word)) return true;
  if (EMAIL_REGEX.test(word)) return true;
  if (PLACEHOLDER_REGEX.test(word)) return true;
  if (HAS_DIGIT_REGEX.test(word)) return true;

  if (text !== undefined && start !== undefined && end !== undefined) {
    if (isInsideSpan(text, start, end, EMAIL_IN_TEXT_REGEX)) return true;
    if (isInsideSpan(text, start, end, URL_IN_TEXT_REGEX)) return true;
  }

  return false;
}

function tokenizeWords(text) {
  const tokens = [];

  for (const match of text.matchAll(WORD_REGEX)) {
    if (match.index === undefined) continue;

    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return tokens;
}

function checkRepeatWords(text) {
  const issues = [];
  const tokens = tokenizeWords(text);

  for (let i = 1; i < tokens.length; i++) {
    const prev = tokens[i - 1];
    const curr = tokens[i];
    const between = text.slice(prev.end, curr.start);

    if (!/^\s+$/.test(between)) continue;
    if (prev.word.toLocaleLowerCase("ru") !== curr.word.toLocaleLowerCase("ru")) {
      continue;
    }

    const { word, start, end } = curr;

    if (shouldSkipRepeatToken(word, text, start, end)) continue;

    issues.push({ word, start, end });
  }

  return issues;
}

const cases = [
  { text: "что что снова", expectIssues: 1, word: "что" },
  { text: "я полетел на на Кипр", expectIssues: 1, word: "на" },
  { text: "слово, слово", expectIssues: 0 },
  { text: "привет мир", expectIssues: 0 },
  { text: "API API", expectIssues: 1, word: "API" },
];

let failed = 0;

for (const testCase of cases) {
  const issues = checkRepeatWords(testCase.text);

  if (issues.length !== testCase.expectIssues) {
    console.error(
      `FAIL: "${testCase.text}" → expected ${testCase.expectIssues} issue(s), got ${issues.length}`,
      issues,
    );
    failed++;
    continue;
  }

  if (testCase.expectIssues > 0) {
    const issue = issues.find((hit) => hit.word === testCase.word);
    if (!issue) {
      console.error(
        `FAIL: "${testCase.text}" → expected word "${testCase.word}", got`,
        issues.map((hit) => hit.word),
      );
      failed++;
      continue;
    }
  }

  console.log(`ok: "${testCase.text}"`);
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
