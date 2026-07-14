import { isCustomWord } from "../spell/checker";
import { shouldSkipToken } from "../spell/skip";
import { yoReplacement } from "../spell/yo";
import type { Rule } from "../types";

const WORD_REGEX =
  /[а-яёА-ЯЁ]+(?:-[а-яёА-ЯЁ]+)*|[a-zA-Z]+(?:'[a-zA-Z]+)*/g;

export const yoLetterRule: Rule = {
  id: "yo-letter",
  name: "Пишем через букву «ё»",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Проверяем некторые слова, которые должны писаться через букву «ё».",
    "В словарь не входят омонимы вроде «все» и «всё», чтобы не ловить ложные срабатывания.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(WORD_REGEX)) {
      if (match.index === undefined) continue;

      const word = match[0];
      const start = match.index;
      const end = start + word.length;

      if (!/[а-яёА-ЯЁ]/.test(word)) continue;

      const replacement = yoReplacement(word);
      if (!replacement) continue;
      if (isCustomWord(word)) continue;
      if (shouldSkipToken(word, text, start, end)) continue;

      issues.push({
        ruleId: "yo-letter",
        message: "",
        match: word,
        replacement,
        start,
        end,
      });
    }

    return issues;
  },
};
