export function collectAutoLayoutNodes(): SceneNode[] {
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

  for (const child of figma.currentPage.children) {
    walk(child);
  }

  return nodes;
}
