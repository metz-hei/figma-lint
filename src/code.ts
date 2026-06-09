import { lintTextNodes } from "./linter";
import { lintTextNodesSpell } from "./spell-lint";
import type { LintResultMessage } from "./types";

declare const __html__: string;

figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

function collectTextNodes(): TextNode[] {
  const nodes: TextNode[] = [];

  const walk = (node: SceneNode) => {
    if (!node.visible) {
      return;
    }
    if (node.type === "TEXT" && node.characters.trim().length > 0) {
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

async function runLint(): Promise<LintResultMessage> {
  const textNodes = collectTextNodes();
  const syncIssues = lintTextNodes(textNodes);
  const { issues: spellIssues, error: spellError } =
    await lintTextNodesSpell(textNodes);

  if (spellError) {
    figma.notify(
      `${spellError}. Проверьте интернет и перезагрузите плагин после npm run build.`,
      { error: true },
    );
  }

  return {
    type: "lint-result",
    issues: [...syncIssues, ...spellIssues],
    scanned: textNodes.length,
  };
}

figma.ui.onmessage = (msg: { type: string; nodeId?: string }) => {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "lint") {
    void runLint().then((result) => figma.ui.postMessage(result));
    return;
  }

  if (msg.type === "select-node" && msg.nodeId) {
    void selectNodeById(msg.nodeId);
  }
};

async function selectNodeById(nodeId: string): Promise<void> {
  const node = await figma.getNodeByIdAsync(nodeId);
  if (!node || node.type === "PAGE" || node.type === "DOCUMENT") {
    return;
  }

  const sceneNode = node as SceneNode;
  figma.currentPage.selection = [sceneNode];
  figma.viewport.scrollAndZoomIntoView([sceneNode]);
}

void runLint().then((result) => figma.ui.postMessage(result));
