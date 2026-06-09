import { isCustomWord } from "../spell/checker";
import { shouldSkipToken } from "../spell/skip";
import type { YandexSpellError } from "../spell/yandex";
import type { LintSeverity, Rule } from "../types";

export const spellCheckRule = {
  id: "spell-check",
  name: "Орфография",
  severity: "warning" as LintSeverity,
  guide: [
    "Возможная опечатка — проверьте глазами. Это предупреждение, а не нарушение редполитики.",
    "Проверка через Яндекс.Спеллер (русский и английский). Тексты отправляются на сервер Яндекса.",
    "Бренды и внутренние термины добавляйте в кастомный справочник (src/spell/custom-words.ts).",
  ],
} satisfies Pick<Rule, "id" | "name" | "severity" | "guide">;

export function mapSpellErrors(
  text: string,
  apiErrors: YandexSpellError[],
): ReturnType<Rule["check"]> {
  const issues: ReturnType<Rule["check"]> = [];

  for (const error of apiErrors) {
    if (error.code !== 1) continue;

    const { word, pos, len } = error;
    const suggestions = error.s ?? [];
    const start = pos;
    const end = pos + len;

    if (isCustomWord(word)) continue;
    if (shouldSkipToken(word, text, start, end)) continue;

    const replacement = suggestions[0] ?? "";
    const message =
      suggestions.length > 1
        ? `Варианты: ${suggestions.slice(1, 4).join(", ")}`
        : "";

    issues.push({
      ruleId: spellCheckRule.id,
      message,
      severity: spellCheckRule.severity,
      match: word,
      replacement,
      start,
      end,
    });
  }

  return issues;
}
