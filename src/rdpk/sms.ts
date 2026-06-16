import type { Rule } from "../types";

/** Ловит «sms», «SMS», «смс» и другие регистровые варианты. «СМС» — уже верно. */
const SMS_REGEX = /\b(?:sms)\b|(?:смс)/gi;

const SMS_SUGGESTION = "СМС";

export const smsRule: Rule = {
  id: "sms",
  name: "СМС пишем по-русски",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Иностранные слова и названия пишем по-русски и склоняем по правилам русского языка.",
    "Сокращение «смс-сообщение» пишем заглавными буквами: СМС.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(SMS_REGEX)) {
      if (match.index === undefined || match[0] === SMS_SUGGESTION) continue;

      issues.push({
        ruleId: "sms",
        message: "",
        match: match[0],
        replacement: SMS_SUGGESTION,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
