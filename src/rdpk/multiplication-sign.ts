import type { Rule } from "../types";

/**
 * Ловит размеры с неверным знаком умножения: «50х50», «50 Х 50», «50*50»,
 * а также «50 × 50» с пробелами вокруг правильного знака ×.
 */
const WRONG_MULTIPLY_REGEX = /(\d+)\s*(?:[хХ*]|\s×|×\s)\s*(\d+)/g;

const CORRECT_MULTIPLY = "×";

export const multiplicationSignRule: Rule = {
  id: "multiplication-sign",
  name: "Различаем знак умножения",
  severity: "error",
  type: "Редполитика",
  guide: [
    "Между числами в размерах или примерах ставим знак умножения × (U+00D7), без пробелов: 50×50"
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(WRONG_MULTIPLY_REGEX)) {
      if (match.index === undefined) continue;

      const left = match[1];
      const right = match[2];
      const fixed = `${left}${CORRECT_MULTIPLY}${right}`;

      issues.push({
        ruleId: "multiplication-sign",
        message: "",
        match: match[0],
        replacement: fixed,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
