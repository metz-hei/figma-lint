/** Smoke-test для обрезки контекста ошибки (дублирует src/ui/lib/issue.ts). */
const BEFORE = 12;
const AFTER = 0;

function getIssueSnippet(text, start, end) {
  const snippetStart = Math.max(0, start - BEFORE);
  const snippetEnd = Math.min(text.length, end + AFTER);
  return {
    text: text.slice(snippetStart, snippetEnd),
    start: start - snippetStart,
    end: end - snippetStart,
    prefixEllipsis: snippetStart > 0,
    suffixEllipsis: snippetEnd < text.length,
  };
}

const long =
  "50х50 50Х50 50 х 50 50*50 50 × 50 50× 50 50 ×50 50×50 Размер 50х50 см 30*40 и 50х50";

const cases = [
  {
    label: "50*50",
    start: long.indexOf("50*50"),
    end: long.indexOf("50*50") + "50*50".length,
    expectText: "Х50 50 х 50 50*50",
    expectStart: 12,
    expectEnd: 17,
    prefixEllipsis: true,
    suffixEllipsis: true,
  },
  {
    label: "30*40",
    start: long.indexOf("30*40"),
    end: long.indexOf("30*40") + "30*40".length,
    expectText: "ер 50х50 см 30*40",
    expectStart: 12,
    expectEnd: 17,
    prefixEllipsis: true,
    suffixEllipsis: true,
  },
];

let failed = 0;

for (const c of cases) {
  const s = getIssueSnippet(long, c.start, c.end);
  if (s.text !== c.expectText) {
    console.error(
      `FAIL ${c.label} text: got "${s.text}", expected "${c.expectText}"`,
    );
    failed++;
  }
  if (s.start !== c.expectStart || s.end !== c.expectEnd) {
    console.error(
      `FAIL ${c.label} range: got ${s.start}-${s.end}, expected ${c.expectStart}-${c.expectEnd}`,
    );
    failed++;
  }
  if (
    s.prefixEllipsis !== c.prefixEllipsis ||
    s.suffixEllipsis !== c.suffixEllipsis
  ) {
    console.error(`FAIL ${c.label} ellipsis`, s);
    failed++;
  } else {
    console.log(`ok: ${c.label}`);
  }
}

if (failed > 0) process.exit(1);
console.log(`\n${cases.length} cases passed`);
