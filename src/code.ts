import { lintTextNodes } from "./linter";
import {
  getDefaultSettings,
  getFullRulesCatalog,
  normalizeSettings,
  SETTINGS_STORAGE_KEY,
} from "./settings";
import { spellCheckRule } from "./rules/spell-check";
import { lintTextNodesSpell } from "./spell-lint";
import type {
  InitMessage,
  LintResultMessage,
  PluginSettings,
  SettingsUpdatedMessage,
} from "./types";

declare const __html__: string;

figma.showUI(__html__, { width: 420, height: 560, themeColors: true });

let settings: PluginSettings = getDefaultSettings();

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

function getEnabledRuleIds(): Set<string> {
  return new Set(settings.enabledRuleIds);
}

async function loadSettings(): Promise<void> {
  const stored = await figma.clientStorage.getAsync(SETTINGS_STORAGE_KEY);
  settings = normalizeSettings(stored as PluginSettings | null | undefined);
}

async function saveSettings(next: PluginSettings): Promise<void> {
  settings = normalizeSettings(next);
  await figma.clientStorage.setAsync(SETTINGS_STORAGE_KEY, settings);
}

async function runLint(): Promise<LintResultMessage> {
  const textNodes = collectTextNodes();
  const enabledRuleIds = getEnabledRuleIds();
  const syncIssues = lintTextNodes(textNodes, enabledRuleIds);

  let spellIssues: LintResultMessage["issues"] = [];
  let spellError: string | undefined;

  if (enabledRuleIds.has(spellCheckRule.id)) {
    const spellResult = await lintTextNodesSpell(textNodes);
    spellIssues = spellResult.issues;
    spellError = spellResult.error;
  }

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

function postInit(): void {
  const message: InitMessage = {
    type: "init",
    rulesCatalog: getFullRulesCatalog(),
    settings,
  };
  figma.ui.postMessage(message);
}

figma.ui.onmessage = (msg: {
  type: string;
  nodeId?: string;
  enabledRuleIds?: string[];
}) => {
  if (msg.type === "close") {
    figma.closePlugin();
    return;
  }

  if (msg.type === "lint") {
    void runLint().then((result) => figma.ui.postMessage(result));
    return;
  }

  if (msg.type === "update-settings" && msg.enabledRuleIds) {
    void saveSettings({ enabledRuleIds: msg.enabledRuleIds })
      .then(() => {
        const updated: SettingsUpdatedMessage = {
          type: "settings-updated",
          settings,
        };
        figma.ui.postMessage(updated);
        return runLint();
      })
      .then((result) => figma.ui.postMessage(result));
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

async function bootstrap(): Promise<void> {
  await loadSettings();
  postInit();
  const result = await runLint();
  figma.ui.postMessage(result);
}

void bootstrap();
