import type { LintIssue, Rule, RuleContext, RuleCatalogEntry } from "./types";
import { isEffectivelyVisible } from "./visibility";
import { currencySpaceRule } from "./rdpk/currency-space";
import { decimalCommaRule } from "./rdpk/decimal-comma";
import { duplicateSpacesRule } from "./rdpk/duplicate-spaces";
import { emailRule } from "./rdpk/email";
import { smsRule } from "./rdpk/sms";
import { cashbackRule } from "./rdpk/cashback";
import { lowercaseVyRule } from "./rdpk/lowercase-vy";
import { multiplicationSignRule } from "./rdpk/multiplication-sign";
import { negativeMinusRule } from "./rdpk/negative-minus";
import { signedAmountRule } from "./rdpk/signed-amount";
import { punctuationSpaceRule } from "./rdpk/punctuation-space";
import { repeatWordsRule } from "./rdpk/repeat-words";
import { thousandSeparatorRule } from "./rdpk/thousand-separator";
import { incompleteCentsRule } from "./rdpk/incomplete-cents";
import { zeroCentsRule } from "./rdpk/zero-cents";

const RULES: Rule[] = [
  decimalCommaRule,
  incompleteCentsRule,
  zeroCentsRule,
  currencySpaceRule,
  thousandSeparatorRule,
  negativeMinusRule,
  signedAmountRule,
  multiplicationSignRule,
  emailRule,
  smsRule,
  cashbackRule,
  lowercaseVyRule,
  duplicateSpacesRule,
  punctuationSpaceRule,
  repeatWordsRule,
];

export function getRulesCatalog(): RuleCatalogEntry[] {
  return RULES.map(({ id, name }) => ({
    id,
    name,
    category: "rdpk",
  }));
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
        issueKind: "text",
        severity: rule.severity,
        type: rule.type,
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
