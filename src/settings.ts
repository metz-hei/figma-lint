import { getFigmaRulesCatalog } from "./figma-lint";
import { getRulesCatalog } from "./linter";
import { spellCheckRule } from "./rdpk/spell-check";
import type { PluginSettings, RuleCatalogEntry } from "./types";

export const SETTINGS_STORAGE_KEY = "figma-lint-enabled-rules";

export function getFullRulesCatalog(): RuleCatalogEntry[] {
  return [
    ...getRulesCatalog(),
    {
      id: spellCheckRule.id,
      name: spellCheckRule.name,
      category: "spell",
    },
    ...getFigmaRulesCatalog(),
  ];
}

export function getDefaultSettings(): PluginSettings {
  return {
    enabledRuleIds: getFullRulesCatalog().map((rule) => rule.id),
  };
}

export function normalizeSettings(
  stored: PluginSettings | null | undefined,
): PluginSettings {
  const catalogIds = getFullRulesCatalog().map((rule) => rule.id);

  if (!stored?.enabledRuleIds) {
    return getDefaultSettings();
  }

  if (stored.enabledRuleIds.length === 0) {
    return { enabledRuleIds: [] };
  }

  const enabled = new Set(
    stored.enabledRuleIds.filter((id) => catalogIds.includes(id)),
  );

  // ponytail: новые правила из каталога включаем по умолчанию; «выключить все» сохраняем
  for (const id of catalogIds) {
    if (!enabled.has(id)) {
      enabled.add(id);
    }
  }

  return {
    enabledRuleIds: catalogIds.filter((id) => enabled.has(id)),
  };
}
