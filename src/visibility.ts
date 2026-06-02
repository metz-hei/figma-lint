/** Узел и все предки до страницы отображаются в файле (не скрыты). */
export function isEffectivelyVisible(node: SceneNode): boolean {
  let current: BaseNode | null = node;

  while (current && current.type !== "PAGE" && current.type !== "DOCUMENT") {
    if ("visible" in current && !current.visible) {
      return false;
    }
    current = current.parent;
  }

  return true;
}
