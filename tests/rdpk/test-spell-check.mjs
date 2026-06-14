/**
 * Smoke-test для орфографии (дублирует src/spell/* и src/rdpk/spell-check.ts).
 */
const CUSTOM_WORDS = ["Тинькофф", "СБП"];

const URL_REGEX = /^https?:\/\//i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_IN_TEXT_REGEX = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const URL_IN_TEXT_REGEX = /https?:\/\/[^\s]+/gi;
const PLACEHOLDER_REGEX = /^(?:\{\{[^}]+\}\}|%[sd]|%\d+\$[sd]|\{[0-9]+\})$/;
const ALL_CAPS_REGEX = /^[A-Z]{2,}$/;
const HAS_DIGIT_REGEX = /\d/;

function isInsideSpan(text, start, end, regex) {
  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) continue;

    const spanStart = match.index;
    const spanEnd = spanStart + match[0].length;
    if (start >= spanStart && end <= spanEnd) return true;
  }

  return false;
}

const customWords = new Set(
  CUSTOM_WORDS.map((word) => word.toLocaleLowerCase("ru")),
);

function shouldSkipToken(word, text, start, end) {
  if (word.length < 2) return true;
  if (/^\d+$/.test(word)) return true;
  if (URL_REGEX.test(word)) return true;
  if (EMAIL_REGEX.test(word)) return true;
  if (PLACEHOLDER_REGEX.test(word)) return true;
  if (ALL_CAPS_REGEX.test(word)) return true;
  if (HAS_DIGIT_REGEX.test(word)) return true;

  if (text !== undefined && start !== undefined && end !== undefined) {
    if (isInsideSpan(text, start, end, EMAIL_IN_TEXT_REGEX)) return true;
    if (isInsideSpan(text, start, end, URL_IN_TEXT_REGEX)) return true;
  }

  return false;
}

function isCustomWord(word) {
  return customWords.has(word.toLocaleLowerCase("ru"));
}

function mapSpellErrors(text, apiErrors) {
  const issues = [];

  for (const error of apiErrors) {
    if (error.code !== 1) continue;

    const { word, pos, len } = error;
    const suggestions = error.s ?? [];
    const start = pos;
    const end = pos + len;

    if (isCustomWord(word)) continue;
    if (shouldSkipToken(word, text, start, end)) continue;

    issues.push({
      word,
      start,
      end,
      replacement: suggestions[0] ?? "",
      suggestions,
      code: error.code,
    });
  }

  return issues;
}

const API_RESPONSES = {
  привте: [
    {
      code: 1,
      pos: 0,
      row: 0,
      col: 0,
      len: 6,
      word: "привте",
      s: ["привет"],
    },
  ],
  "hello wrld": [
    {
      code: 1,
      pos: 6,
      row: 0,
      col: 6,
      len: 4,
      word: "wrld",
      s: ["world"],
    },
  ],
  "привет мир": [],
  "Оплата через Тинькофф": [
    {
      code: 1,
      pos: 13,
      row: 0,
      col: 13,
      len: 8,
      word: "Тинькофф",
      s: [],
    },
  ],
  "Перевод по СБП": [
    {
      code: 1,
      pos: 11,
      row: 0,
      col: 11,
      len: 3,
      word: "СБП",
      s: [],
    },
  ],
  "Используйте API": [],
  "Напишите на test@mail.ru": [],
  "Привет, {{name}}": [],
  "50,00 ₽": [],
  API: [
    {
      code: 3,
      pos: 0,
      row: 0,
      col: 0,
      len: 3,
      word: "API",
      s: ["Api"],
    },
  ],
};

const cases = [
  {
    text: "привте",
    expectIssues: 1,
    word: "привте",
    suggestionIncludes: "привет",
  },
  {
    text: "hello wrld",
    expectIssues: 1,
    word: "wrld",
    suggestionIncludes: "world",
  },
  { text: "привет мир", expectIssues: 0 },
  { text: "Оплата через Тинькофф", expectIssues: 0 },
  { text: "Перевод по СБП", expectIssues: 0 },
  { text: "Используйте API", expectIssues: 0 },
  { text: "Напишите на test@mail.ru", expectIssues: 0 },
  { text: "Привет, {{name}}", expectIssues: 0 },
  { text: "50,00 ₽", expectIssues: 0 },
  { text: "API", expectIssues: 0 },
];

let failed = 0;

for (const testCase of cases) {
  const apiErrors = API_RESPONSES[testCase.text] ?? [];
  const issues = mapSpellErrors(testCase.text, apiErrors);

  if (issues.length !== testCase.expectIssues) {
    console.error(
      `FAIL: "${testCase.text}" → expected ${testCase.expectIssues} issue(s), got ${issues.length}`,
      issues,
    );
    failed++;
    continue;
  }

  if (testCase.expectIssues > 0) {
    const issue = issues.find((hit) => hit.word === testCase.word);
    if (!issue) {
      console.error(
        `FAIL: "${testCase.text}" → expected word "${testCase.word}", got`,
        issues.map((hit) => hit.word),
      );
      failed++;
      continue;
    }

    if (testCase.suggestionIncludes) {
      const hasSuggestion = issue.suggestions.some((item) =>
        item.toLocaleLowerCase("ru").includes(testCase.suggestionIncludes),
      );
      if (!hasSuggestion) {
        console.error(
          `FAIL: "${testCase.text}" → expected suggestion containing "${testCase.suggestionIncludes}", got`,
          issue.suggestions,
        );
        failed++;
        continue;
      }
    }
  }

  console.log(`ok: "${testCase.text}"`);
}

function encodeFormField(key, value) {
  return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

function buildCheckTextsBody(texts) {
  const parts = [];

  for (const text of texts) {
    parts.push(encodeFormField("text", text));
  }

  parts.push(encodeFormField("lang", "ru,en"));
  parts.push(encodeFormField("options", "14"));

  return parts.join("&");
}

const MAX_POST_CHARS = 10_000;
const API_URL =
  "https://speller.yandex.net/services/spellservice.json/checkTexts";

function chunkTexts(texts) {
  const chunks = [];
  let currentChunk = [];
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

async function checkTextsYandex(texts, fetchImpl) {
  if (texts.length === 0) return { results: [] };

  const chunks = chunkTexts(texts);
  const results = new Array(texts.length);
  let error;
  let offset = 0;

  for (const chunk of chunks) {
    try {
      const response = await fetchImpl(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: buildCheckTextsBody(chunk),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const chunkResults = await response.json();
      for (let i = 0; i < chunk.length; i++) {
        results[offset + i] = chunkResults[i] ?? [];
      }
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "spell error";
      for (let i = 0; i < chunk.length; i++) {
        results[offset + i] = [];
      }
    }
    offset += chunk.length;
  }

  return { results, error };
}

const originalFetch = globalThis.fetch;

globalThis.fetch = async (_url, init) => {
  const params = new URLSearchParams(init.body);
  const texts = params.getAll("text");
  const payload = texts.map((text) => API_RESPONSES[text] ?? []);

  return {
    ok: true,
    async json() {
      return payload;
    },
  };
};

try {
  const { results: batchResults } = await checkTextsYandex(
    ["привте", "hello wrld"],
    fetch,
  );
  const batchIssues = [
    ...mapSpellErrors("привте", batchResults[0] ?? []),
    ...mapSpellErrors("hello wrld", batchResults[1] ?? []),
  ];

  if (batchIssues.length !== 2) {
    console.error(
      `FAIL: batch checkTexts → expected 2 issues, got ${batchIssues.length}`,
      batchIssues,
    );
    failed++;
  } else {
    console.log("ok: batch checkTexts");
  }

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    async json() {
      return [];
    },
  });

  const { results: errorResults } = await checkTextsYandex(["привте"], fetch);
  if ((errorResults[0] ?? []).length !== 0) {
    console.error("FAIL: network error should return empty spell results");
    failed++;
  } else {
    console.log("ok: network error fallback");
  }
} finally {
  globalThis.fetch = originalFetch;
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length + 2} cases passed`);
