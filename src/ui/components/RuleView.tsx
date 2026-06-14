import type { LintIssue } from "@shared/types";

import { HighlightedIssueSnippet } from "@/components/HighlightedText";
import { Badge } from "@/components/ui/badge";
import { getIssueDisplaySnippet } from "@/lib/issue";
import { Separator } from "@/components/ui/separator";
import { TypographyP } from "@/components/ui/typography";

type RuleViewProps = {
  issue: LintIssue;
};

function renderCurrentIssue(issue: LintIssue) {
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

export function RuleView({ issue }: RuleViewProps) {
  return (
    <div className="space-y-4 p-3">
      <div>
        <h2 className="mb-3 text-[13px] font-semibold">{issue.ruleName}</h2>
        <div className="text-muted-foreground">
          {issue.ruleGuide.map((paragraph) => (
            <TypographyP
              key={paragraph}
              className="mt-0 text-[11px] first:mt-0 [&:not(:first-child)]:mt-3"
            >
              {paragraph}
            </TypographyP>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
          Правило
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{issue.type}</Badge>
          <Badge variant="outline">{issue.ruleId}</Badge>
        </div>
      </div>

      <Separator />

      <div>
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase">
          Текущая ошибка
        </p>
        <TypographyP className="mt-0 text-[11px] break-words [&:not(:first-child)]:mt-3">
          {renderCurrentIssue(issue)}
        </TypographyP>
        {issue.message ? (
          <TypographyP className="mt-0 text-[11px] break-words [&:not(:first-child)]:mt-3">
            {issue.message}
          </TypographyP>
        ) : null}
      </div>
    </div>
  );
}
