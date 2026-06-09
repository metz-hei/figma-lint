export type YandexSpellError = {
  code: number;
  pos: number;
  row: number;
  col: number;
  len: number;
  word: string;
  s: string[];
};

export type YandexSpellBatchResult = {
  results: YandexSpellError[][];
  error?: string;
};

const API_URL =
  "https://speller.yandex.net/services/spellservice.json/checkTexts";
const MAX_POST_CHARS = 10_000;
const LANG = "ru,en";
/** IGNORE_DIGITS (2) + IGNORE_URLS (4) + FIND_REPEAT_WORDS (8) */
const OPTIONS = 14;

function encodeFormField(key: string, value: string): string {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function buildCheckTextsBody(texts: string[]): string {
  const parts: string[] = [];

  for (const text of texts) {
    parts.push(encodeFormField("text", text));
  }

  parts.push(encodeFormField("lang", LANG));
  parts.push(encodeFormField("options", String(OPTIONS)));

  return parts.join("&");
}

async function fetchCheckTexts(
  texts: string[],
): Promise<YandexSpellError[][]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildCheckTextsBody(texts),
  });

  if (!response.ok) {
    throw new Error(`Яндекс.Спеллер: HTTP ${response.status}`);
  }

  return (await response.json()) as YandexSpellError[][];
}

function chunkTexts(texts: string[]): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentSize = 0;

  for (const text of texts) {
    const textLen = text.length;
    if (currentChunk.length > 0 && currentSize + textLen > MAX_POST_CHARS) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(text);
    currentSize += textLen;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

export async function checkTextsYandex(
  texts: string[],
): Promise<YandexSpellBatchResult> {
  if (texts.length === 0) {
    return { results: [] };
  }

  const chunks = chunkTexts(texts);
  const results: YandexSpellError[][] = new Array(texts.length);
  let error: string | undefined;

  let offset = 0;
  for (const chunk of chunks) {
    try {
      const chunkResults = await fetchCheckTexts(chunk);
      for (let i = 0; i < chunk.length; i++) {
        results[offset + i] = chunkResults[i] ?? [];
      }
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Не удалось проверить орфографию";
      error = message;

      for (let i = 0; i < chunk.length; i++) {
        results[offset + i] = [];
      }
    }
    offset += chunk.length;
  }

  return { results, error };
}
