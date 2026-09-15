/**
 * Единый источник правды для области сканирования Figma.
 *
 * Если есть выделение — проверяем только его, иначе всю текущую страницу.
 * Все коллекторы узлов и оркестратор линта должны использовать этот хелпер,
 * чтобы не дублировать условие `selection.length > 0 ? selection : children`.
 */
export function getScanRoots(): readonly SceneNode[] {
  const selection = figma.currentPage.selection;
  return selection.length > 0 ? selection : figma.currentPage.children;
}
