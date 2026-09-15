import { getScanRoots } from "./scope";

export function collectAutoLayoutNodes(
  roots: readonly SceneNode[] = getScanRoots(),
): SceneNode[] {
  const nodes: SceneNode[] = [];

  const walk = (node: SceneNode) => {
    if (!node.visible) {
      return;
    }

    if ("layoutMode" in node && node.layoutMode !== "NONE") {
      nodes.push(node);
    }

    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  for (const root of roots) {
    walk(root);
  }

  return nodes;
}
