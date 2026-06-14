import type { LintIssue } from "@shared/types";

export const ISSUE_SNIPPET_BEFORE = 12;
export const ISSUE_SNIPPET_AFTER = 0;

export type IssueSnippet = {
  text: string;
  start: number;
  end: number;
  prefixEllipsis: boolean;
  suffixEllipsis: boolean;
};

export function getIssueSnippet(
  text: string,
  start: number,
  end: number,
  contextBefore = ISSUE_SNIPPET_BEFORE,
  contextAfter = ISSUE_SNIPPET_AFTER,
): IssueSnippet {
  const snippetStart = Math.max(0, start - contextBefore);
  const snippetEnd = Math.min(text.length, end + contextAfter);

  return {
    text: text.slice(snippetStart, snippetEnd),
    start: start - snippetStart,
    end: end - snippetStart,
    prefixEllipsis: snippetStart > 0,
    suffixEllipsis: snippetEnd < text.length,
  };
}

export function getIssueDisplaySnippet(issue: LintIssue): IssueSnippet {
  if (issue.issueKind === "node") {
    return {
      text: issue.match,
      start: 0,
      end: issue.match.length,
      prefixEllipsis: false,
      suffixEllipsis: false,
    };
  }

  return getIssueSnippet(issue.text, issue.start, issue.end);
}
