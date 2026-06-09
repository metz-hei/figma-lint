export type LintSeverity = "error" | "warning";

export type LintType = "Редполитика" | "Ошибка набора";

export type LintIssue = {
  ruleId: string;
  ruleName: string;
  ruleGuide: string[];
  message: string;
  severity: LintSeverity;
  type: LintType;
  nodeId: string;
  nodeName: string;
  text: string;
  match: string;
  replacement: string;
  start: number;
  end: number;
};

export type RuleContext = {
  nodeName: string;
  /** true, если у узла или любого предка имя совпадает (без учёта регистра) */
  inLayerNamed: (name: string) => boolean;
};

export type Rule = {
  id: string;
  name: string;
  severity: LintSeverity;
  type: LintType;
  /** Сопроводительный текст правила — абзацы для показа в UI */
  guide: string[];
  check: (text: string, context: RuleContext) => Omit<
    LintIssue,
    "nodeId" | "nodeName" | "text" | "ruleName" | "ruleGuide" | "severity" | "type"
  >[];
};

export type RuleCatalogEntry = {
  id: string;
  name: string;
};

export type PluginSettings = {
  enabledRuleIds: string[];
};

export type InitMessage = {
  type: "init";
  rulesCatalog: RuleCatalogEntry[];
  settings: PluginSettings;
};

export type UpdateSettingsMessage = {
  type: "update-settings";
  enabledRuleIds: string[];
};

export type SettingsUpdatedMessage = {
  type: "settings-updated";
  settings: PluginSettings;
};

export type LintResultMessage = {
  type: "lint-result";
  issues: LintIssue[];
  scanned: number;
};
