import type { Rule } from "../types";

/** Два и более пробельных символа подряд: обычный, неразрывный, узкий неразрывный, таб. */
const DUPLICATE_SPACES_REGEX = /[ \u00A0\u202F\t]{2,}/g;

export const duplicateSpacesRule: Rule = {
  id: "duplicate-spaces",
  name: "Задублированные пробелы",
  severity: "error",
  guide: [
    "Между словами и знаками препинания используем один пробел",
  ],
  check(text, _context) {
    const issues: ReturnType<Rule["check"]> = [];

    for (const match of text.matchAll(DUPLICATE_SPACES_REGEX)) {
      if (match.index === undefined) continue;

      issues.push({
        ruleId: "duplicate-spaces",
        message: "",
        severity: "error",
        match: match[0],
        replacement: " ",
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    return issues;
  },
};
