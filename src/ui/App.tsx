import { Settings } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  FixResultMessage,
  InitMessage,
  LintIssue,
  LintResultMessage,
  PluginSettings,
  SettingsUpdatedMessage,
} from "@shared/types";

import { IssuesList, getIssueFixKey } from "@/components/IssuesList";
import { RuleView } from "@/components/RuleView";
import { SettingsView } from "@/components/SettingsView";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { onPluginMessage, postToPlugin } from "@/lib/figma";

function ruPlural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function formatScannedLayers(n: number): string {
  const layer = ruPlural(n, ["слой", "слоя", "слоёв"]);
  if (n % 10 === 1 && n % 100 !== 11) {
    return `${n} текстовый ${layer}`;
  }
  return `${n} текстовых ${layer}`;
}

function formatSummary(issues: LintIssue[], scanned: number) {
  if (issues.length === 0) {
    return `Проверено ${formatScannedLayers(scanned)} — замечаний нет`;
  }

  const remark = ruPlural(issues.length, ["ание", "ания", "аний"]);
  const layer = ruPlural(scanned, ["слой", "слоя", "слоёв"]);
  return `${issues.length} замеч${remark} · ${scanned} ${layer}`;
}

export default function App() {
  const [view, setView] = useState<"issues" | "rule" | "settings">("issues");
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const [scanned, setScanned] = useState(0);
  const [activeIssue, setActiveIssue] = useState<LintIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [rulesCatalog, setRulesCatalog] = useState<
    InitMessage["rulesCatalog"]
  >([]);
  const [settings, setSettings] = useState<PluginSettings>({
    enabledRuleIds: [],
  });
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const applyResult = useCallback((payload: LintResultMessage) => {
    setIssues(payload.issues);
    setScanned(payload.scanned);
    setLoading(false);
    setFixingKey(null);
    setFixError(null);
    setView((current) => (current === "settings" ? current : "issues"));
    setActiveIssue(null);
  }, []);

  useEffect(() => {
    return onPluginMessage<
      | InitMessage
      | LintResultMessage
      | SettingsUpdatedMessage
      | FixResultMessage
    >((message) => {
      if (message.type === "init") {
        setRulesCatalog(message.rulesCatalog);
        setSettings(message.settings);
        return;
      }

      if (message.type === "settings-updated") {
        setSettings(message.settings);
        return;
      }

      if (message.type === "fix-result") {
        setFixingKey(null);
        if (!message.ok) {
          setFixError(message.error ?? "Не удалось применить правку");
        }
        return;
      }

      if (message.type === "lint-result") {
        applyResult(message);
      }
    });
  }, [applyResult]);

  const handleRescan = () => {
    setLoading(true);
    postToPlugin({ type: "lint" });
  };

  const handleSelectNode = (issue: LintIssue) => {
    postToPlugin({ type: "select-node", nodeId: issue.nodeId });
  };

  const handleOpenRule = (issue: LintIssue) => {
    setActiveIssue(issue);
    setView("rule");
  };

  const handleFixIssue = (issue: LintIssue) => {
    setFixError(null);
    setFixingKey(getIssueFixKey(issue));
    postToPlugin({ type: "fix-issue", issue });
  };

  const handleSettingsChange = (enabledRuleIds: string[]) => {
    setSettings({ enabledRuleIds });
    setLoading(true);
    postToPlugin({ type: "update-settings", enabledRuleIds });
  };

  const headerTitle =
    view === "rule"
      ? "Правило"
      : view === "settings"
        ? "Настройки"
        : "Figma Lint";

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-3 py-2.5">
        <div className="min-w-0">
          <h1 className="text-[13px] font-semibold">{headerTitle}</h1>
          <p className="text-muted-foreground text-[11px]">
            {loading
              ? "Сканирование…"
              : fixError ?? formatSummary(issues, scanned)}
          </p>
        </div>
        {view === "issues" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Настройки"
            onClick={() => setView("settings")}
          >
            <Settings />
          </Button>
        ) : null}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {view === "settings" ? (
          <SettingsView
            rulesCatalog={rulesCatalog}
            settings={settings}
            onChange={handleSettingsChange}
          />
        ) : loading ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-[11px]">
            Ищем проблемы…
          </p>
        ) : view === "rule" && activeIssue ? (
          <RuleView issue={activeIssue} />
        ) : issues.length === 0 ? (
          <p className="text-muted-foreground px-3 py-6 text-center text-[11px]">
            Всё чисто
          </p>
        ) : (
          <IssuesList
            issues={issues}
            onSelectNode={handleSelectNode}
            onOpenRule={handleOpenRule}
            onFixIssue={handleFixIssue}
            fixingKey={fixingKey}
          />
        )}
      </ScrollArea>

      <Separator />

      {view === "issues" ? (
        <footer className="flex shrink-0 gap-2 p-2.5">
          <Button className="flex-1" onClick={handleRescan}>
            Проверить снова
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            onClick={() => postToPlugin({ type: "close" })}
          >
            Закрыть
          </Button>
        </footer>
      ) : view === "settings" ? (
        <footer className="flex shrink-0 gap-2 p-2.5">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setView("issues")}
          >
            ← Назад
          </Button>
          <Button className="flex-1" onClick={handleRescan} disabled={loading}>
            Проверить снова
          </Button>
        </footer>
      ) : (
        <footer className="flex shrink-0 gap-2 p-2.5">
          <Button
            variant="secondary"
            className="shrink-0"
            onClick={() => setView("issues")}
          >
            ← Назад
          </Button>
          <Button
            className="flex-1"
            onClick={() => activeIssue && handleSelectNode(activeIssue)}
            disabled={!activeIssue}
          >
            Перейти к ошибке
          </Button>
        </footer>
      )}
    </div>
  );
}
