/** Smoke-test для merge-логики normalizeSettings (дублирует src/settings.ts). */
function normalizeEnabledRuleIds(storedIds, catalogIds) {
  if (!storedIds) {
    return [...catalogIds];
  }

  if (storedIds.length === 0) {
    return [];
  }

  const enabled = new Set(storedIds.filter((id) => catalogIds.includes(id)));

  for (const id of catalogIds) {
    if (!enabled.has(id)) {
      enabled.add(id);
    }
  }

  return catalogIds.filter((id) => enabled.has(id));
}

const sampleCatalog = [
  "cashback",
  "lowercase-vy",
  "yo-letter",
  "spell-check",
];

const cases = [
  {
    name: "новое правило добавляется к сохранённым",
    stored: ["cashback", "spell-check"],
    expect: ["cashback", "lowercase-vy", "yo-letter", "spell-check"],
  },
  {
    name: "выключить все сохраняется",
    stored: [],
    expect: [],
  },
  {
    name: "удалённые из каталога отбрасываются",
    stored: ["cashback", "removed-rule"],
    expect: ["cashback", "lowercase-vy", "yo-letter", "spell-check"],
  },
];

let failed = 0;

for (const { name, stored, expect } of cases) {
  const got = normalizeEnabledRuleIds(stored, sampleCatalog);
  const ok =
    got.length === expect.length && got.every((id, i) => id === expect[i]);

  if (!ok) {
    console.error(`FAIL: ${name}`);
    console.error("  expected:", expect);
    console.error("  got:", got);
    failed++;
  } else {
    console.log(`ok: ${name}`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);
