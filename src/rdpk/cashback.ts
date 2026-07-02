import type { Rule } from "../types";

/** Неверные варианты: «кэш…» или «…бек» вместо «кешбэк». */
const CASHBACK_WRONG_REGEX = /к(?:эшб[еэ]к|ешбек)[а-яё]*/gi;

const CORRECT_STEM = "кешбэк";

export function isWrongCashback(word: string): boolean {
  return /к(?:эшб[еэ]к|ешбек)[а-яё]*/i.test(word);
}

function cashbackReplacement(match: string): string {
  const lower = match.toLocaleLowerCase("ru");
  const suffixMatch = lower.match(/^к(?:эшб[еэ]к|ешбек)([а-яё]*)$/);
  const suffix = suffixMatch?.[1] ?? "";
  const corrected = CORRECT_STEM + suffix;
  if (match[0] === match[0].toUpperCase()) {
    return corrected[0].toUpperCase() + corrected.slice(1);
  }
  return corrected;
}

export const cashbackRule: Rule = {
  id: "cashback",
  name: "Кешбэк",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Слово «кешбэк» пишем с «е» в первом слоге: кешбэк.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(CASHBACK_WRONG_REGEX)) {
      if (match.index === undefined) continue;

      issues.push({
        ruleId: "cashback",
        message: "",
        match: match[0],
        replacement: cashbackReplacement(match[0]),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
