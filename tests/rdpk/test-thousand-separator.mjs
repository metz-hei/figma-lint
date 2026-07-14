/** Smoke-test для паттерна thousand-separator (дублирует src/rdpk/thousand-separator.ts). */
const NBSP = "\u00A0";
const NARROW_NBSP = "\u202F";

const NUMBER_REGEX =
  /(?<![\d])([–−—-]?)((?:\d{1,3}(?:[ \u00A0\u202F,.]\d{3})+|\d{4,})(?:,\d+)?)(?![\d,.])/g;

const DATE_REGEX = /(?<![\d.])\d{1,2}\.\d{1,2}\.\d{2,4}(?![\d.])/g;
const DELIMITED_DIGITS_REGEX = /\d+(?:[–−—/-]\d+)+/g;
const BANK_ACCOUNT_MASK_REGEX =
  /\d{5}[ \u00A0\u202F]\d{3}[ \u00A0\u202F]\d[ \u00A0\u202F]\d{4}[ \u00A0\u202F]\d{7}/g;

function isPartOfDate(text, start, end) {
  for (const dateMatch of text.matchAll(DATE_REGEX)) {
    if (dateMatch.index === undefined) continue;

    const dateStart = dateMatch.index;
    const dateEnd = dateStart + dateMatch[0].length;
    if (start >= dateStart && end <= dateEnd) return true;
  }

  return false;
}

function isPartOfDelimitedDigits(text, start, end) {
  for (const digitMatch of text.matchAll(DELIMITED_DIGITS_REGEX)) {
    if (digitMatch.index === undefined) continue;

    const digitStart = digitMatch.index;
    const digitEnd = digitStart + digitMatch[0].length;
    if (start >= digitStart && end <= digitEnd) return true;
  }

  return false;
}

function isPartOfBankAccountMask(text, start, end) {
  for (const maskMatch of text.matchAll(BANK_ACCOUNT_MASK_REGEX)) {
    if (maskMatch.index === undefined) continue;

    const maskStart = maskMatch.index;
    const maskEnd = maskStart + maskMatch[0].length;
    if (start >= maskStart && end <= maskEnd) return true;
  }

  return false;
}

function isLongDigitRun(body) {
  return /\d{10,}/.test(body);
}

function isYearToken(body) {
  const parsed = parseNumberBody(body);
  if (!parsed || parsed.frac !== undefined) return false;

  const { intDigits } = parsed;
  if (!/^\d{4}$/.test(intDigits)) return false;

  const year = Number(intDigits);
  return year >= 2001 && year <= 2029;
}

function isLeadingZeroAmount(body) {
  const parsed = parseNumberBody(body);
  if (!parsed) return false;

  return parsed.intDigits.startsWith("0");
}

function formatThousands(digits) {
  if (digits.length <= 3) return digits;
  const groups = [];
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
  }
  return groups.join(NBSP);
}

function parseNumberBody(body) {
  const enThousands = body.match(/^(\d{1,3}(?:,\d{3})+)(?:,(\d+))?$/);
  if (enThousands) {
    return {
      intDigits: enThousands[1].replace(/,/g, ""),
      frac: enThousands[2],
    };
  }

  const decSplit = body.match(/^(.+?),(\d+)$/);
  if (decSplit) {
    const intRaw = decSplit[1];
    if (!/[,.]/.test(intRaw.replace(/[ \u00A0\u202F]/g, ""))) {
      return {
        intDigits: intRaw.replace(/[ \u00A0\u202F]/g, ""),
        frac: decSplit[2],
      };
    }
  }

  const intDigits = body.replace(/[ \u00A0\u202F,.]/g, "");
  if (!/^\d+$/.test(intDigits)) return null;

  return { intDigits };
}

function formatNumberToken(sign, body) {
  const parsed = parseNumberBody(body);
  if (!parsed) return null;

  const { intDigits, frac } = parsed;
  if (!/^\d+$/.test(intDigits)) return null;
  if (Number(intDigits) < 1000) return null;

  const normalizedSign = sign ? "–" : "";
  const formattedInt = formatThousands(intDigits);
  const fixed =
    frac !== undefined
      ? `${normalizedSign}${formattedInt},${frac}`
      : `${normalizedSign}${formattedInt}`;

  const original = `${sign}${body}`;
  if (original === fixed) return null;
  if (original === fixed.replaceAll(NBSP, NARROW_NBSP)) return null;

  return fixed;
}

function check(text) {
  const hits = [];
  for (const match of text.matchAll(NUMBER_REGEX)) {
    if (match.index === undefined) continue;

    const sign = match[1] ?? "";
    const body = match[2];
    const start = match.index;
    const end = start + match[0].length;

    if (
      isPartOfDate(text, start, end) ||
      isPartOfDelimitedDigits(text, start, end) ||
      isPartOfBankAccountMask(text, start, end) ||
      isLongDigitRun(body) ||
      isYearToken(body) ||
      isLeadingZeroAmount(body)
    ) {
      continue;
    }

    const fixed = formatNumberToken(sign, body);
    if (fixed) hits.push({ match, fixed });
  }
  return hits;
}

function getFixedText(text, hit) {
  const { match, fixed } = hit;
  return (
    text.slice(0, match.index) +
    fixed +
    text.slice(match.index + match[0].length)
  );
}

const cases = [
  { text: "1000", expect: true },
  { text: "10000", expect: true },
  { text: "1000000", expect: true },
  { text: "1 000", expect: true },
  { text: "10 000", expect: true },
  { text: "1,000", expect: true },
  { text: "1.000", expect: true },
  { text: "1000,00", expect: true },
  { text: "1 250,00", expect: true },
  { text: "-5000", expect: true },
  { text: `1${NBSP}000`, expect: false },
  { text: `10${NBSP}000`, expect: false },
  { text: `1${NARROW_NBSP}000`, expect: false },
  { text: "999", expect: false },
  { text: "50,50", expect: false },
  { text: "50×50", expect: false },
  { text: "50–100", expect: false },
  { text: "12.12.2004", expect: false },
  { text: "до 01.01.2020 включительно", expect: false },
  { text: "в 2024 году", expect: false },
  { text: "2020", expect: false },
  { text: "2001", expect: false },
  { text: "2029", expect: false },
  { text: "2000", expect: true },
  { text: "2030", expect: true },
  { text: "1999", expect: true },
  { text: "0000", expect: false },
  { text: "0083730", expect: false },
  { text: "05000", expect: false },
  { text: "40802 810 3 0000 0083730", expect: false },
  { text: "1234567890", expect: false },
  { text: "ИНН 1234567890", expect: false },
  { text: "0642-58-51325", expect: false },
  { text: "642-585-1325", expect: false },
  { text: "12/20092355", expect: false },
  { text: "10000000000", expect: false },
  { text: "Цена: 5000 ₽", expect: true },
  { text: "10,000,000", expect: true },
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
  { text: "1000", fixed: `1${NBSP}000` },
  { text: "10000", fixed: `10${NBSP}000` },
  { text: "1000000", fixed: `1${NBSP}000${NBSP}000` },
  { text: "1 000", fixed: `1${NBSP}000` },
  { text: "1,000", fixed: `1${NBSP}000` },
  { text: "1000,00", fixed: `1${NBSP}000,00` },
  { text: "1 250,00", fixed: `1${NBSP}250,00` },
  { text: "-5000", fixed: `–5${NBSP}000` },
  { text: "Цена: 5000 ₽", fixed: `Цена: 5${NBSP}000 ₽` },
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
