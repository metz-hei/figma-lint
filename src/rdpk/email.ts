import type { Rule } from "../types";

/** Ловит «email», «Email», «e-mail» и другие регистровые варианты. */
const EMAIL_REGEX = /\b(?:e-?mail)\b/gi;

const EMAIL_SUGGESTION = "имейл или электронная почта";

function emailReplacement(match: string): string {
  const isSentenceCase =
    match[0] === match[0].toUpperCase() &&
    match.slice(1) === match.slice(1).toLowerCase();

  if (isSentenceCase) {
    return "Имейл или электронная почта";
  }

  return EMAIL_SUGGESTION;
}

export const emailRule: Rule = {
  id: "email",
  name: "Имейл или электронная почта",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Иностранные слова и названия пишем по-русски и склоняем по правилам русского языка.",
    "Если термина нет в редполитике, смотрим правильное написание в «Академосе» Института русского языка РАН.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(EMAIL_REGEX)) {
      if (match.index === undefined) continue;

      issues.push({
        ruleId: "email",
        message: "",
        match: match[0],
        replacement: emailReplacement(match[0]),
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
