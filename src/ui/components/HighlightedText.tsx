type HighlightedTextProps = {
  text: string;
  start: number;
  end: number;
};

export function HighlightedText({ text, start, end }: HighlightedTextProps) {
  const before = text.slice(0, start);
  const match = text.slice(start, end);
  const after = text.slice(end);

  return (
    <span>
      {before}
      <mark className="rounded-sm bg-amber-200 px-0.5 text-foreground">
        {match}
      </mark>
      {after}
    </span>
  );
}
