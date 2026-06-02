import type { LintIssue } from "@shared/types";

import { HighlightedText } from "@/components/HighlightedText";
import { Separator } from "@/components/ui/separator";
import { TypographyP } from "@/components/ui/typography";

type RuleViewProps = {
  issue: LintIssue;
};

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
          Эта ошибка
        </p>
        <TypographyP className="mt-0 mb-2 text-[11px]">{issue.message}</TypographyP>
        <TypographyP className="mt-0 text-[11px] break-words">
          <HighlightedText
            text={issue.text}
            start={issue.start}
            end={issue.end}
          />
        </TypographyP>
      </div>
    </div>
  );
}
