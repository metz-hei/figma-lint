import type { PluginSettings, RuleCatalogEntry, RuleCategory } from "@shared/types";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";

type SettingsViewProps = {
  rulesCatalog: RuleCatalogEntry[];
  settings: PluginSettings;
  onChange: (enabledRuleIds: string[]) => void;
};

const CATEGORY_SECTIONS: { category: RuleCategory; title: string }[] = [
  { category: "rdpk", title: "Редполитика" },
  { category: "spell", title: "Орфография" },
  { category: "figma", title: "Figma" },
];

function getRuleDescription(rule: RuleCatalogEntry): string {
  if (rule.category === "figma" && rule.guide?.[0]) {
    return rule.guide[0];
  }

  return rule.id;
}

export function SettingsView({
  rulesCatalog,
  settings,
  onChange,
}: SettingsViewProps) {
  const enabledSet = new Set(settings.enabledRuleIds);
  const allEnabled = rulesCatalog.every((rule) => enabledSet.has(rule.id));
  const noneEnabled = rulesCatalog.every((rule) => !enabledSet.has(rule.id));

  const toggleRule = (ruleId: string, checked: boolean) => {
    const next = new Set(settings.enabledRuleIds);

    if (checked) {
      next.add(ruleId);
    } else {
      next.delete(ruleId);
    }

    onChange([...next]);
  };

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <div className="flex flex-col gap-1">
        <p className="text-[12px] font-medium">Активные правила</p>
        <p className="text-muted-foreground text-[11px] leading-snug">
          Используется для изолированного тестирования правил.
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={allEnabled}
          onClick={() => onChange(rulesCatalog.map((rule) => rule.id))}
        >
          Включить все
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={noneEnabled}
          onClick={() => onChange([])}
        >
          Выключить все
        </Button>
      </div>

      {noneEnabled ? (
        <p className="text-destructive text-[11px]">
          Выберите хотя бы одно правило — иначе проверка ничего не найдёт.
        </p>
      ) : null}

      {CATEGORY_SECTIONS.map(({ category, title }) => {
        const sectionRules = rulesCatalog.filter(
          (rule) => rule.category === category,
        );

        if (sectionRules.length === 0) {
          return null;
        }

        return (
          <div key={category} className="flex flex-col gap-2">
            <p className="text-[11px] font-medium">{title}</p>
            <FieldGroup data-slot="checkbox-group" className="gap-3">
              {sectionRules.map((rule) => {
                const checked = enabledSet.has(rule.id);
                const checkboxId = `rule-${rule.id}`;

                return (
                  <FieldLabel key={rule.id} htmlFor={checkboxId}>
                    <Field orientation="horizontal">
                      <Checkbox
                        id={checkboxId}
                        name={checkboxId}
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleRule(rule.id, value === true)
                        }
                      />
                      <FieldContent>
                        <FieldTitle className="text-[12px]">
                          {rule.name}
                        </FieldTitle>
                        <FieldDescription className="text-[10px]">
                          {getRuleDescription(rule)}
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldLabel>
                );
              })}
            </FieldGroup>
          </div>
        );
      })}
    </div>
  );
}
