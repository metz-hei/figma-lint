import { shouldSkipRepeatToken } from "../spell/skip";
import type { Rule } from "../types";

const WORD_REGEX =
  /[а-яёА-ЯЁ]+(?:-[а-яёА-ЯЁ]+)*|[a-zA-Z]+(?:'[a-zA-Z]+)*/g;

type WordToken = {
  word: string;
  start: number;
  end: number;
};

function tokenizeWords(text: string): WordToken[] {
  const tokens: WordToken[] = [];

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

export const repeatWordsRule: Rule = {
  id: "repeat-words",
  name: "Повтор слова",
  severity: "warning",
  type: "Ошибка набора",
  guide: [
    "Одно и то же слово не должно идти подряд дважды.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];
    const tokens = tokenizeWords(text);

    for (let i = 1; i < tokens.length; i++) {
      const prev = tokens[i - 1];
      const curr = tokens[i];
      const between = text.slice(prev.end, curr.start);

      if (!/^\s+$/.test(between)) continue;
      if (
        prev.word.toLocaleLowerCase("ru") !== curr.word.toLocaleLowerCase("ru")
      ) {
        continue;
      }

      const { word, start, end } = curr;

      if (shouldSkipRepeatToken(word, text, start, end)) continue;

      issues.push({
        ruleId: "repeat-words",
        message: "Повтор слова",
        match: word,
        replacement: "",
        start,
        end,
      });
    }

    return issues;
  },
};
