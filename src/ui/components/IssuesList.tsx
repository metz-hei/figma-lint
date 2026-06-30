import type { LintIssue } from "@shared/types";
import { isFixable } from "@shared/fix";
import { Check } from "lucide-react";

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

export function getIssueFixKey(issue: LintIssue): string {
  return `${issue.nodeId}-${issue.ruleId}-${issue.start}-${issue.match}`;
}

type IssuesListProps = {
  issues: LintIssue[];
  onSelectNode: (issue: LintIssue) => void;
  onOpenRule: (issue: LintIssue) => void;
  onFixIssue?: (issue: LintIssue) => void;
  fixingKey?: string | null;
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
  onFixIssue,
  fixingKey = null,
}: IssuesListProps) {
  return (
    <ItemGroup className="divide-y divide-border">
      {issues.map((issue) => (
        <Item
          key={getIssueFixKey(issue)}
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
            {isFixable(issue) && onFixIssue ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="size-7 cursor-pointer p-0"
                aria-label="Применить правку"
                disabled={fixingKey === getIssueFixKey(issue)}
                onClick={(event) => {
                  event.stopPropagation();
                  onFixIssue(issue);
                }}
              >
                <Check />
              </Button>
            ) : null}
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
