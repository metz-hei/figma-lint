import type { LintIssue } from "@shared/types";

import { HighlightedText } from "@/components/HighlightedText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";

type IssuesListProps = {
  issues: LintIssue[];
  onSelectNode: (issue: LintIssue) => void;
  onOpenRule: (issue: LintIssue) => void;
};

export function IssuesList({
  issues,
  onSelectNode,
  onOpenRule,
}: IssuesListProps) {
  return (
    <ItemGroup className="divide-y divide-border">
      {issues.map((issue) => (
        <Item
          key={`${issue.nodeId}-${issue.start}-${issue.end}`}
          variant="outline"
          size="sm"
          className="cursor-pointer rounded-none border-x-0 border-t-0 shadow-none hover:bg-accent"
          onClick={() => onSelectNode(issue)}
        >
          <ItemContent>
            <ItemTitle className="gap-2 text-xs">
              <Badge variant="destructive">{issue.severity}</Badge>
              <span>{issue.nodeName || "Text"}</span>
            </ItemTitle>
            <ItemDescription className="text-[11px] break-words">
              <HighlightedText
                text={issue.text}
                start={issue.start}
                end={issue.end}
              />
            </ItemDescription>
            <ItemDescription className="text-[11px]">
              {issue.message}
            </ItemDescription>
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
