import type { LintIssue } from "@shared/types";

export function getFixedText(issue: LintIssue): string {
  return (
    issue.text.slice(0, issue.start) +
    issue.replacement +
    issue.text.slice(issue.end)
  );
}
