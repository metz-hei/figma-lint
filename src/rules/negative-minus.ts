import type { Rule } from "../types";

/** Правильный минус — en dash (–). Ловит дефис, знак минуса и em dash вплотную к числу. «— 50» с пробелом — не ошибка. */
const WRONG_MINUS_REGEX = /(?<!\d)(?:-|−|—)(?=\d)/g;

const CORRECT_MINUS = "–";

export const negativeMinusRule: Rule = {
  id: "negative-minus",
  name: "Отрицательные числа пишем с минусом",
  severity: "error",
  guide: [
    "Длинное тире ставим между частями предложения:",
    "Сегодня дождь — возьмите зонт.",
    "Среднее тире показывает диапазон. Ставим в датах, времени, суммах и процентах:",
    "10:00–12:00, 1–3 мая, 50–100 ₽.",
    "Минус пишется перед отрицательным числом. Без пробелов:",
    "–50, –50 444, –50%, –100 ₽.",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(WRONG_MINUS_REGEX)) {
      if (match.index === undefined) continue;

      issues.push({
        ruleId: "negative-minus",
        message: "",
        severity: "error",
        match: match[0],
        replacement: CORRECT_MINUS,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
