import type { IssueSnippet } from "@/lib/issue";

type HighlightedTextProps = {
  text: string;
  start: number;
  end: number;
  prefixEllipsis?: boolean;
  suffixEllipsis?: boolean;
};

export function HighlightedText({
  text,
  start,
  end,
  prefixEllipsis = false,
  suffixEllipsis = false,
}: HighlightedTextProps) {
  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);

  return (
    <span>
      {prefixEllipsis ? "…" : null}
      {before}
      <mark className="rounded-sm bg-amber-200 px-0.5 text-foreground">
        {match}
      </mark>
      {after}
      {suffixEllipsis ? "…" : null}
    </span>
  );
}

export function HighlightedIssueSnippet({ snippet }: { snippet: IssueSnippet }) {
  return (
    <HighlightedText
      text={snippet.text}
      start={snippet.start}
      end={snippet.end}
      prefixEllipsis={snippet.prefixEllipsis}
      suffixEllipsis={snippet.suffixEllipsis}
    />
  );
}
