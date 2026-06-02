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
  name: "Разряды чисел отбиваются неразрывным пробелом",
  severity: "error",
  guide: [
    "В суммах в интерфейсах отбиваем неразрывным пробелом каждый тысячный разряд. Суммы в текстах отделяем пробелами только числа от пяти знаков.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(NUMBER_REGEX)) {
      if (match.index === undefined) continue;

      const sign = match[1] ?? "";
      const body = match[2];
      const fixed = formatNumberToken(sign, body);
      if (!fixed) continue;

      const raw = match[0];

      issues.push({
        ruleId: "thousand-separator",
        message: "",
        severity: "error",
        match: raw,
        replacement: fixed,
        start: match.index,
        end: match.index + raw.length,
      });
    }

    return issues;
  },
};
