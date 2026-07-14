const URL_REGEX = /^https?:\/\//i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_TEXT_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_IN_TEXT_REGEX = /https?:\/\/[^\s]+/gi;
const PLACEHOLDER_REGEX = /^(?:\{\{[^}]+\}\}|%[sd]|%\d+\$[sd]|\{[0-9]+\})$/;
const ALL_CAPS_REGEX = /^[A-Z]{2,}$/;
/** camelCase и PascalCase: colorBackground, ColorBackground */
const CAMEL_CASE_REGEX =
  /^[a-z]+(?:[A-Z][a-z0-9]*)+$|^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]*)+$/;
const HAS_DIGIT_REGEX = /\d/;

function isInsideSpan(
  text: string,
  start: number,
  end: number,
  regex: RegExp,
): boolean {
  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) continue;

    const spanStart = match.index;
    const spanEnd = spanStart + match[0].length;
    if (start >= spanStart && end <= spanEnd) return true;
  }

  return false;
}

function shouldSkipByContext(
  word: string,
  text?: string,
  start?: number,
  end?: number,
  skipAllCaps = true,
): boolean {
  if (word.length < 2) return true;
  if (/^\d+$/.test(word)) return true;
  if (URL_REGEX.test(word)) return true;
  if (EMAIL_REGEX.test(word)) return true;
  if (PLACEHOLDER_REGEX.test(word)) return true;
  if (skipAllCaps && ALL_CAPS_REGEX.test(word)) return true;
  if (CAMEL_CASE_REGEX.test(word)) return true;
  if (HAS_DIGIT_REGEX.test(word)) return true;

  if (text !== undefined && start !== undefined && end !== undefined) {
    if (isInsideSpan(text, start, end, EMAIL_IN_TEXT_REGEX)) return true;
    if (isInsideSpan(text, start, end, URL_IN_TEXT_REGEX)) return true;
  }

  return false;
}

/** Для орфографии: пропускаем аббревиатуры вроде API, СБП. */
export function shouldSkipToken(
  word: string,
  text?: string,
  start?: number,
  end?: number,
): boolean {
  return shouldSkipByContext(word, text, start, end, true);
}

/** Для повторов: аббревиатуры тоже проверяем — «API API» это ошибка. */
export function shouldSkipRepeatToken(
  word: string,
  text?: string,
  start?: number,
  end?: number,
): boolean {
  return shouldSkipByContext(word, text, start, end, false);
}
