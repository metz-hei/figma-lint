export type LintSeverity = "error" | "warning";

export type LintType = "Редполитика" | "Ошибка набора" | "Figma";

export type IssueKind = "text" | "node";

export type RuleCategory = "rdpk" | "figma" | "spell";

export type LintIssue = {
  ruleId: string;
  ruleName: string;
  ruleGuide: string[];
  message: string;
  severity: LintSeverity;
  type: LintType;
  issueKind: IssueKind;
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
    | "nodeId"
    | "nodeName"
    | "text"
    | "ruleName"
    | "ruleGuide"
    | "severity"
    | "type"
    | "issueKind"
  >[];
};

export type FigmaRuleContext = {
  variablesById: ReadonlyMap<string, { name: string }>;
};

export type FigmaRuleHit = Omit<
  LintIssue,
  | "nodeId"
  | "nodeName"
  | "text"
  | "ruleName"
  | "ruleGuide"
  | "severity"
  | "type"
  | "issueKind"
>;

export type FigmaRule = {
  id: string;
  name: string;
  severity: LintSeverity;
  type: LintType;
  category: "figma";
  guide: string[];
  check: (node: SceneNode, context: FigmaRuleContext) => FigmaRuleHit[];
};

export type RuleCatalogEntry = {
  id: string;
  name: string;
  category: RuleCategory;
  guide?: string[];
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

export type FixIssueMessage = {
  type: "fix-issue";
  issue: LintIssue;
};

export type FixResultMessage = {
  type: "fix-result";
  ok: boolean;
  error?: string;
};
