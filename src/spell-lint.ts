import { createRuleContext } from "./linter";
import { mapSpellErrors, spellCheckRule } from "./rules/spell-check";
import { checkTextsSpell } from "./spell/checker";
import type { LintIssue } from "./types";
import { isEffectivelyVisible } from "./visibility";

export type SpellLintResult = {
  issues: LintIssue[];
  error?: string;
};

export async function lintTextNodesSpell(
  nodes: TextNode[],
): Promise<SpellLintResult> {
  const visibleNodes = nodes.filter((node) => isEffectivelyVisible(node));
  if (visibleNodes.length === 0) {
    return { issues: [] };
  }

  const texts = visibleNodes.map((node) => node.characters);
  const { results, error } = await checkTextsSpell(texts);

  const issues = visibleNodes.flatMap((node, index) => {
    const context = createRuleContext(node);
    const spellErrors = results[index] ?? [];

    return mapSpellErrors(node.characters, spellErrors).map((hit) => ({
      ...hit,
      ruleName: spellCheckRule.name,
      ruleGuide: spellCheckRule.guide,
      nodeId: node.id,
      nodeName: context.nodeName,
      text: node.characters,
    }));
  });

  return { issues, error };
}
