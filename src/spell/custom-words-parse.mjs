/** Парсит custom-words.txt: слово, затем строки «-окончание» для того же корня. */
export function parseCustomWords(raw) {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  const exact = [];
  /** @type {Map<string, string[]>} */
  const stems = new Map();
  let currentBase = null;

  for (const line of lines) {
    if (line.startsWith("-")) {
      const suffix = line.slice(1);
      if (!currentBase || !suffix) continue;
      stems.get(currentBase).push(suffix);
      continue;
    }

    currentBase = line;
    exact.push(line);
    if (!stems.has(currentBase)) stems.set(currentBase, []);
  }

  return { exact, stems };
}

/** @param {ReturnType<typeof parseCustomWords>} parsed */
export function createCustomWordMatcher(parsed) {
  const exact = new Set(
    parsed.exact.map((word) => word.toLocaleLowerCase("ru")),
  );
  const stems = [...parsed.stems.entries()].map(([base, suffixes]) => [
    base.toLocaleLowerCase("ru"),
    suffixes.map((suffix) => suffix.toLocaleLowerCase("ru")),
  ]);

  return (word) => {
    const normalized = word.toLocaleLowerCase("ru");
    if (exact.has(normalized)) return true;

    for (const [base, suffixes] of stems) {
      for (const suffix of suffixes) {
        if (
          normalized.endsWith(suffix) &&
          normalized.slice(0, -suffix.length) === base
        ) {
          return true;
        }
      }
    }

    return false;
  };
}
