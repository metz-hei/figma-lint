import type { Rule } from "../types";

const NBSP = "\u00A0";
const NARROW_NBSP = "\u202F";

/** Группирует цифры по три справа, разделяя неразрывным пробелом. */
function formatThousands(digits: string): string {
  if (digits.length <= 3) return digits;

  const groups: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i));
  }

  return groups.join(NBSP);
}

/**
 * Числа от 1000 с разделением разрядов неразрывным пробелом.
 * Ловит «1000», «1 000» (обычный пробел), «1,000», «1.000» и т.п.
 */
const NUMBER_REGEX =
  /(?<![\d])([–−—-]?)((?:\d{1,3}(?:[ \u00A0\u202F,.]\d{3})+|\d{4,})(?:,\d+)?)(?![\d,.])/g;

/** Даты вида 12.12.2004 — точки не тысячные разделители. */
const DATE_REGEX = /(?<![\d.])\d{1,2}\.\d{1,2}\.\d{2,4}(?![\d.])/g;

/** Телефоны, коды: 0642-58-51325, 12/20092355 — дефис и / не тысячные разделители. */
const DELIMITED_DIGITS_REGEX = /\d+(?:[–−—/-]\d+)+/g;

/** Маска расчётного счёта: 40802 810 3 0000 0083730. */
const BANK_ACCOUNT_MASK_REGEX =
  /\d{5}[ \u00A0\u202F]\d{3}[ \u00A0\u202F]\d[ \u00A0\u202F]\d{4}[ \u00A0\u202F]\d{7}/g;

/** Hex-цвета: #ED8836, #fff. */
const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{3,8}/g;

function isPartOfDate(text: string, start: number, end: number): boolean {
  for (const dateMatch of text.matchAll(DATE_REGEX)) {
    if (dateMatch.index === undefined) continue;

    const dateStart = dateMatch.index;
    const dateEnd = dateStart + dateMatch[0].length;
    if (start >= dateStart && end <= dateEnd) return true;
  }

  return false;
}

function isPartOfDelimitedDigits(text: string, start: number, end: number): boolean {
  for (const digitMatch of text.matchAll(DELIMITED_DIGITS_REGEX)) {
    if (digitMatch.index === undefined) continue;

    const digitStart = digitMatch.index;
    const digitEnd = digitStart + digitMatch[0].length;
    if (start >= digitStart && end <= digitEnd) return true;
  }

  return false;
}

function isPartOfBankAccountMask(text: string, start: number, end: number): boolean {
  for (const maskMatch of text.matchAll(BANK_ACCOUNT_MASK_REGEX)) {
    if (maskMatch.index === undefined) continue;

    const maskStart = maskMatch.index;
    const maskEnd = maskStart + maskMatch[0].length;
    if (start >= maskStart && end <= maskEnd) return true;
  }

  return false;
}

function isPartOfHexColor(text: string, start: number, end: number): boolean {
  for (const hexMatch of text.matchAll(HEX_COLOR_REGEX)) {
    if (hexMatch.index === undefined) continue;

    const hexStart = hexMatch.index;
    const hexEnd = hexStart + hexMatch[0].length;
    if (start >= hexStart && end <= hexEnd) return true;
  }

  return false;
}

/** БИК, ИНН и прочие идентификаторы: 9+ цифр подряд без разделителей. */
function isLongDigitRun(body: string): boolean {
  return /\d{9,}/.test(body);
}

/** Годы 2001–2029 без дробной части — не отбиваем разряды. */
function isYearToken(body: string): boolean {
  const parsed = parseNumberBody(body);
  if (!parsed || parsed.frac !== undefined) return false;

  const { intDigits } = parsed;
  if (!/^\d{4}$/.test(intDigits)) return false;

  const year = Number(intDigits);
  return year >= 2001 && year <= 2029;
}

/** Счета и коды с ведущим нулём: 0083730, 0000. */
function isLeadingZeroAmount(body: string): boolean {
  const parsed = parseNumberBody(body);
  if (!parsed) return false;

  return parsed.intDigits.startsWith("0");
}

function parseNumberBody(body: string): { intDigits: string; frac?: string } | null {
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

function formatNumberToken(sign: string, body: string): string | null {
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

export const thousandSeparatorRule: Rule = {
  id: "thousand-separator",
  name: "Разряды отбиваются неразрывным пробелом",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Отбиваем разряды неразрывным пробелом начиная с тысяч.",
    "Чтобы не ловить ложные срабатывания на ИНН и БИК установлен порог проверки в 9 цифр. Поэтому правило поймает только десятки миллионов.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

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
        isPartOfHexColor(text, start, end) ||
        isLongDigitRun(body) ||
        isYearToken(body) ||
        isLeadingZeroAmount(body)
      ) {
        continue;
      }

      const fixed = formatNumberToken(sign, body);
      if (!fixed) continue;

      const raw = match[0];

      issues.push({
        ruleId: "thousand-separator",
        message: "",
        match: raw,
        replacement: fixed,
        start,
        end,
      });
    }

    return issues;
  },
};
