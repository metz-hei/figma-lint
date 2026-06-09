import type { LintIssue, Rule, RuleContext, RuleCatalogEntry } from "./types";
import { isEffectivelyVisible } from "./visibility";
import { currencySpaceRule } from "./rules/currency-space";
import { decimalCommaRule } from "./rules/decimal-comma";
import { duplicateSpacesRule } from "./rules/duplicate-spaces";
import { emailRule } from "./rules/email";
import { multiplicationSignRule } from "./rules/multiplication-sign";
import { negativeMinusRule } from "./rules/negative-minus";
import { punctuationSpaceRule } from "./rules/punctuation-space";
import { repeatWordsRule } from "./rules/repeat-words";
import { thousandSeparatorRule } from "./rules/thousand-separator";
import { zeroCentsRule } from "./rules/zero-cents";

const RULES: Rule[] = [
  decimalCommaRule,
  zeroCentsRule,
  currencySpaceRule,
  thousandSeparatorRule,
  negativeMinusRule,
  multiplicationSignRule,
  emailRule,
  duplicateSpacesRule,
  punctuationSpaceRule,
  repeatWordsRule,
];

export function getRulesCatalog(): RuleCatalogEntry[] {
  return RULES.map(({ id, name }) => ({ id, name }));
}

export function createRuleContext(node: TextNode): RuleContext {
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
  enabledRuleIds?: ReadonlySet<string>,
): LintIssue[] {
  const issues: LintIssue[] = [];
  const rules =
    enabledRuleIds === undefined
      ? RULES
      : RULES.filter((rule) => enabledRuleIds.has(rule.id));

  for (const rule of rules) {
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

export function lintTextNodes(
  nodes: TextNode[],
  enabledRuleIds?: ReadonlySet<string>,
): LintIssue[] {
  return nodes.flatMap((node) => {
    if (!isEffectivelyVisible(node)) {
      return [];
    }
    return lintText(
      node.characters,
      node.id,
      createRuleContext(node),
      enabledRuleIds,
    );
  });
}
