import type { LintIssue, Rule, RuleContext } from "./types";
import { decimalCommaRule } from "./rules/decimal-comma";
import { zeroCentsRule } from "./rules/zero-cents";

const RULES: Rule[] = [decimalCommaRule, zeroCentsRule];

function createRuleContext(node: TextNode): RuleContext {
  return {
    nodeName: node.name,
    inLayerNamed(name) {
      const target = name.trim().toLowerCase();
      let current: BaseNode | null = node;

      while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
        if ("name" in current && current.name.trim().toLowerCase() === target) {
          return true;
        }
        current = current.parent;
      }

      return false;
    },
  };
}

export function lintText(
  text: string,
  nodeId: string,
  context: RuleContext,
): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const rule of RULES) {
    for (const hit of rule.check(text, context)) {
      issues.push({
        ...hit,
        ruleName: rule.name,
        ruleGuide: rule.guide,
        nodeId,
        nodeName: context.nodeName,
        text,
      });
    }
  }

  return issues;
}

export function lintTextNodes(nodes: TextNode[]): LintIssue[] {
  return nodes.flatMap((node) =>
    lintText(node.characters, node.id, createRuleContext(node)),
  );
}
