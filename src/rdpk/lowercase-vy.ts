import type { Rule } from "../types";

/** Вы, Вас, Вам и формы «ваш» с заглавной — ошибка, кроме начала предложения. */
const VY_REGEX =
  /(?<![а-яёА-ЯЁa-zA-Z])(Вы|Вас|Вам|Вами|Ваш(?:а|е|и|его|ему|ем|ей|их|им|ими|у)?)(?![а-яёА-ЯЁa-zA-Z])/g;

function isSentenceStart(text: string, index: number): boolean {
  if (index === 0) return true;
  return /(?:[.!?…][ \t]*|[\n\r][ \t]*)$/.test(text.slice(0, index));
}

export const lowercaseVyRule: Rule = {
  id: "lowercase-vy",
  name: "«Вы» с маленькой буквы",
  severity: "error",
  type: "Редполитика",
  guide: [
    "В интерфейсе всегда пишем «вы» с маленькой буквы.",
    "С большой — только в начале предложения или в деловых письмах.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(VY_REGEX)) {
      if (match.index === undefined || isSentenceStart(text, match.index)) {
        continue;
      }

      const replacement = match[0].toLocaleLowerCase("ru");

      issues.push({
        ruleId: "lowercase-vy",
        message: "",
        match: match[0],
        replacement,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
