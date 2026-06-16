import type { Rule } from "../types";

/** Плюс и минус вплотную к сумме: +50 ₽ –50 ₽ */
const SIGNED_CURRENCY_SPACE_REGEX =
  /(?<!\d)((?:\+|–|-|−)\s+)(\d+(?:[,\s]\d+)*\s?[₽$€¥£₸₼])/g;

const CORRECT_MINUS = "–";

export const signedAmountRule: Rule = {
  id: "signed-amount",
  name: "Плюс и минус пишем вплотную к сумме",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Плюс и минус ставим вплотную к сумме, без пробелов:",
    "+50 ₽, –50 ₽, +1 000 ₽, –100 $.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(SIGNED_CURRENCY_SPACE_REGEX)) {
      if (match.index === undefined) continue;

      const sign = match[1].trim();
      const amount = match[2];
      const replacementSign = sign === "+" ? "+" : CORRECT_MINUS;

      issues.push({
        ruleId: "signed-amount",
        message: "",
        match: match[0],
        replacement: `${replacementSign}${amount}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
