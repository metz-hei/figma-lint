import type { FigmaRuleContext } from "../../types";

export async function createFigmaRuleContext(
  boundVariableIds: Iterable<string> = [],
): Promise<FigmaRuleContext> {
  const variablesById = new Map<string, { name: string }>();

  const localVariables = await figma.variables.getLocalVariablesAsync();
  for (const variable of localVariables) {
    variablesById.set(variable.id, { name: variable.name });
  }

  for (const id of boundVariableIds) {
    if (variablesById.has(id)) {
      continue;
    }

    const variable = await figma.variables.getVariableByIdAsync(id);
    if (variable) {
      variablesById.set(variable.id, { name: variable.name });
    }
  }

  return { variablesById };
}
