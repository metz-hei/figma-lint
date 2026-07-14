import { parseCustomWords } from "./custom-words-parse.mjs";
import yoWordsRaw from "./yo-words.txt";

type ParsedWords = ReturnType<typeof parseCustomWords>;

function expandCanonicalForms(parsed: ParsedWords): string[] {
  const forms: string[] = [];

  for (const word of parsed.exact) {
    forms.push(word);
  }

  for (const [base, suffixes] of parsed.stems) {
    for (const suffix of suffixes) {
      forms.push(base + suffix);
    }
  }

  return forms;
}

function toEForm(word: string): string {
  return word.toLocaleLowerCase("ru").replace(/ё/g, "е");
}

function buildEFormIndex(parsed: ParsedWords): Map<string, string> {
  const index = new Map<string, string>();

  for (const canonical of expandCanonicalForms(parsed)) {
    index.set(toEForm(canonical), canonical.toLocaleLowerCase("ru"));
  }

  return index;
}

const E_FORM_INDEX = buildEFormIndex(parseCustomWords(yoWordsRaw));

function restoreCase(original: string, canonical: string): string {
  if (original[0] === original[0].toLocaleUpperCase("ru")) {
    return canonical[0].toLocaleUpperCase("ru") + canonical.slice(1);
  }
  return canonical;
}

export function yoReplacement(word: string): string | null {
  const lower = word.toLocaleLowerCase("ru");
  const canonical = E_FORM_INDEX.get(toEForm(word));
  if (!canonical || lower === canonical) return null;
  return restoreCase(word, canonical);
}
