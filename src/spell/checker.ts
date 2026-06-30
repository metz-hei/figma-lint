import { isCustomWordMatch } from "./custom-words";
import { checkTextsYandex, type YandexSpellError } from "./yandex";

const CYRILLIC_REGEX = /[а-яёА-ЯЁ]/;
const LATIN_REGEX = /[a-zA-Z]/;

export type SpellLanguage = "ru" | "en";

export type SpellCheckResult = {
  results: YandexSpellError[][];
  error?: string;
};

export function detectLanguage(word: string): SpellLanguage | null {
  const hasCyrillic = CYRILLIC_REGEX.test(word);
  const hasLatin = LATIN_REGEX.test(word);

  if (hasCyrillic && hasLatin) return null;
  if (hasCyrillic) return "ru";
  if (hasLatin) return "en";
  return null;
}

export function isCustomWord(word: string): boolean {
  return isCustomWordMatch(word);
}

export async function checkTextsSpell(
  texts: string[],
): Promise<SpellCheckResult> {
  return checkTextsYandex(texts);
}
