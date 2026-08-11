import type { Rule } from "../types";

const NBSP = "\u00A0";

/** Предлоги и союзы до 2 букв. Двухбуквенные первыми, чтобы «во» не матчилось как «в». */
const PARTICLES = [
  "во",
  "ко",
  "со",
  "об",
  "от",
  "до",
  "из",
  "за",
  "на",
  "по",
  "но",
  "да",
  "ни",
  "в",
  "к",
  "с",
  "у",
  "о",
  "а",
  "и",
];

const PARTICLE_RE = new RegExp(
  `(?<![а-яёА-ЯЁa-zA-Z0-9_])(${PARTICLES.join("|")})([ \\u202F]+)(?=[а-яёА-ЯЁa-zA-Z0-9])`,
  "gi",
);

/** «и т.д.», «и т.п.», «и др.», «и пр.» — не трогаем. */
function isAbbreviationAfterI(text: string, nextIndex: number): boolean {
  return /^т\.\s*[дп]\.|^др\.|^пр\./i.test(text.slice(nextIndex));
}

export const prepositionNbspRule: Rule = {
  id: "preposition-nbsp",
  name: "Неразрывный пробел после предлога и союза",
  severity: "error",
  type: "Редполитика",
  guide: [
    "После предлогов и союзов до двух букв включительно ставим неразрывный пробел",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(PARTICLE_RE)) {
      if (match.index === undefined) continue;

      const particle = match[1];
      const nextIndex = match.index + match[0].length;
      if (
        particle.toLocaleLowerCase("ru") === "и" &&
        isAbbreviationAfterI(text, nextIndex)
      ) {
        continue;
      }

      issues.push({
        ruleId: "preposition-nbsp",
        message: "",
        match: match[0],
        replacement: `${particle}${NBSP}`,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
