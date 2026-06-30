import wordsRaw from "./custom-words.txt";
import {
  createCustomWordMatcher,
  parseCustomWords,
} from "./custom-words-parse.mjs";

const parsed = parseCustomWords(wordsRaw);

/** Точные записи из справочника (без строк «-окончание»). */
export const CUSTOM_WORDS = parsed.exact;

export const isCustomWordMatch = createCustomWordMatcher(parsed);
