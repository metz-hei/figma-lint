export type LintSeverity = "error" | "warning";

export type LintIssue = {
  ruleId: string;
  ruleName: string;
  ruleGuide: string[];
  message: string;
  severity: LintSeverity;
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
  /** Сопроводительный текст правила — абзацы для показа в UI */
  guide: string[];
  check: (text: string, context: RuleContext) => Omit<
    LintIssue,
    "nodeId" | "nodeName" | "text" | "ruleName" | "ruleGuide"
  >[];
};

export type LintResultMessage = {
  type: "lint-result";
  issues: LintIssue[];
  scanned: number;
};
