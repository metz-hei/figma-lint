import { lintTextNodes } from "./linter";
import type { LintResultMessage } from "./types";

declare const __html__: string;

figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

function collectTextNodes(): TextNode[] {
  const nodes: TextNode[] = [];

  const walk = (node: SceneNode) => {
    if (node.type === "TEXT" && node.characters.trim().length > 0) {
      nodes.push(node);
    }
    if ("children" in node) {
      for (const child of node.children) {
        walk(child);
      }
    }
  };

  walk(figma.currentPage);
  return nodes;
}

function runLint(): LintResultMessage {
  const textNodes = collectTextNodes();
  const issues = lintTextNodes(textNodes);

  return {
    type: "lint-result",
    issues,
    scanned: textNodes.length,
  };
}

figma.ui.onmessage = (msg: { type: string; nodeId?: string }) => {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "lint") {
    figma.ui.postMessage(runLint());
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

figma.ui.postMessage(runLint());
