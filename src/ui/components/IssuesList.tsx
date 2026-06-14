import type { LintIssue } from "@shared/types";

import { HighlightedIssueSnippet } from "@/components/HighlightedText";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { getIssueDisplaySnippet } from "@/lib/issue";

type IssuesListProps = {
  issues: LintIssue[];
  onSelectNode: (issue: LintIssue) => void;
  onOpenRule: (issue: LintIssue) => void;
};

function renderIssueDescription(issue: LintIssue) {
  if (issue.issueKind === "node") {
    return (
      <>
        {issue.match}
        {issue.replacement ? ` → ${issue.replacement}` : null}
      </>
    );
  }

  return (
    <>
      <HighlightedIssueSnippet snippet={getIssueDisplaySnippet(issue)} />
      {" → "}
      {issue.replacement}
    </>
  );
}

export function IssuesList({
  issues,
  onSelectNode,
  onOpenRule,
}: IssuesListProps) {
  return (
    <ItemGroup className="divide-y divide-border">
      {issues.map((issue) => (
        <Item
          key={`${issue.nodeId}-${issue.ruleId}-${issue.match}`}
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-none border-x-0 border-t-0 shadow-none hover:bg-accent"
          onClick={() => onSelectNode(issue)}
        >
          <ItemContent>
            <ItemTitle className="text-xs">{issue.ruleName}</ItemTitle>
            <ItemDescription className="text-[11px] break-words">
              {renderIssueDescription(issue)}
            </ItemDescription>
            {issue.message ? (
              <ItemDescription className="text-[11px]">
                {issue.message}
              </ItemDescription>
            ) : null}
          </ItemContent>
          <ItemActions>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={(event) => {
                event.stopPropagation();
                onOpenRule(issue);
              }}
            >
              Правило
            </Button>
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
  );
}
