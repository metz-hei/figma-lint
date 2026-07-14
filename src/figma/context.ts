import type { FigmaRuleContext } from "../../types";

export async function createFigmaRuleContext(
  boundVariableIds: Iterable<string> = [],
): Promise<FigmaRuleContext> {
  const variablesById = new Map<string, { name: string }>();
  const collectionNamesById = new Map<string, string>();

  const getVariableName = async (variable: Variable) => {
    let collectionName = collectionNamesById.get(variable.variableCollectionId);

    if (collectionName === undefined) {
      const collection = await figma.variables.getVariableCollectionByIdAsync(
        variable.variableCollectionId,
      );
      collectionName = collection?.name ?? "";
      collectionNamesById.set(variable.variableCollectionId, collectionName);
    }

    return collectionName === "Radius"
      ? `${collectionName}/${variable.name}`
      : variable.name;
  };

  const localVariables = await figma.variables.getLocalVariablesAsync();
  for (const variable of localVariables) {
    variablesById.set(variable.id, { name: await getVariableName(variable) });
  }

  for (const id of boundVariableIds) {
    if (variablesById.has(id)) {
      continue;
    }

    const variable = await figma.variables.getVariableByIdAsync(id);
    if (variable) {
      variablesById.set(variable.id, { name: await getVariableName(variable) });
    }
  }

  return { variablesById };
}
