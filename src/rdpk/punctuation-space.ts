import type { Rule } from "../types";

const WS = "[ \\u00A0\\u202F\\t]+";

/** Пробел перед ! , . ? ; : … */
const PUNCT_REGEX = new RegExp(`(\\S)${WS}([!.?,;:\\u2026])`, "g");

function collectIssues(
  text: string,
  regex: RegExp,
  ruleId: string,
): ReturnType<Rule["check"]> {
  const issues: ReturnType<Rule["check"]> = [];

  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) continue;

    const char = match[1];
    const punct = match[2];

    issues.push({
      ruleId,
      message: "",
      match: match[0],
      replacement: `${char}${punct}`,
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return issues;
}

export const punctuationSpaceRule: Rule = {
  id: "punctuation-space",
  name: "Знаки препинания пишутся без пробела слева",
  severity: "error",
  type: "Ошибка набора",
  guide: [
    "Знаки ! , . ? ; : … пишутся без пробела от предыдущего слова или символа.",
  ],
  check(text, _context) {
    return collectIssues(text, PUNCT_REGEX, "punctuation-space");
  },
};
