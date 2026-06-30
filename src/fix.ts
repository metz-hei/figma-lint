import type { LintIssue } from "./types";

export function isFixable(issue: LintIssue): boolean {
  if (issue.issueKind !== "text") return false;
  if (issue.ruleId === "spell-check" && !issue.replacement) return false;
  return true;
}

export function applyTextReplacement(
  text: string,
  issue: Pick<LintIssue, "start" | "end" | "match" | "replacement">,
): string | null {
  if (text.slice(issue.start, issue.end) !== issue.match) return null;
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}
