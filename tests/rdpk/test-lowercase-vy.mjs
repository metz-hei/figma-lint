/** Smoke-test для паттерна lowercase-vy (дублирует src/rdpk/lowercase-vy.ts). */
const VY_REGEX =
  /(?<![а-яёА-ЯЁa-zA-Z])(Вы|Вас|Вам|Вами|Ваш(?:а|е|и|его|ему|ем|ей|их|им|ими|у)?)(?![а-яёА-ЯЁa-zA-Z])/g;

function isSentenceStart(text, index) {
  if (index === 0) return true;
  return /(?:[.!?…][ \t]*|[\n\r][ \t]*)$/.test(text.slice(0, index));
}

function check(text) {
  const hits = [];
  for (const match of text.matchAll(VY_REGEX)) {
    if (isSentenceStart(text, match.index)) continue;
    hits.push(match);
  }
  return hits;
}

const cases = [
  { text: "Вы можете войти", expect: false },
  { text: "Если Вы забыли пароль", expect: true },
  { text: "Мы уведомим Вас", expect: true },
  { text: "Если Вам нужна помощь", expect: true },
  { text: "Спасибо. Вы получили письмо", expect: false },
  { text: "Спасибо, Вы получили письмо", expect: true },
  { text: "ваш пароль", expect: false },
  { text: "Укажите Ваш пароль", expect: true },
  { text: "Ваш пароль", expect: false },
  { text: "Вашингтон", expect: false },
  { text: "мы сообщим вам", expect: false },
  { text: "Обратитесь к нам, если Вами интересует", expect: true },
];

let failed = 0;

for (const { text, expect } of cases) {
  const hits = check(text);
  const got = hits.length > 0;
  if (got !== expect) {
    console.error(`FAIL: "${text}" → expected ${expect}, got ${got}`, hits);
    failed++;
  } else {
    console.log(`ok: "${text}"`);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`\n${cases.length} cases passed`);

const fixCases = [
  { text: "Если Вы забыли пароль", fixed: "Если вы забыли пароль" },
  { text: "Мы уведомим Вас", fixed: "Мы уведомим вас" },
  { text: "Укажите Ваш пароль", fixed: "Укажите ваш пароль" },
  { text: "Вы можете войти", fixed: "Вы можете войти" },
];

for (const { text, fixed } of fixCases) {
  const hits = check(text);
  if (fixed === text && hits.length !== 0) {
    console.error(`FAIL fix: "${text}" → should not match`);
    process.exit(1);
  }
  if (fixed !== text && hits.length !== 1) {
    console.error(`FAIL fix: "${text}" → expected 1 hit, got ${hits.length}`);
    process.exit(1);
  }
  if (fixed === text) {
    console.log(`ok fix: "${text}" → unchanged`);
    continue;
  }
  const replacement = hits[0][0].toLocaleLowerCase("ru");
  const got =
    text.slice(0, hits[0].index) +
    replacement +
    text.slice(hits[0].index + hits[0][0].length);
  if (got !== fixed) {
    console.error(`FAIL fix: "${text}" → expected "${fixed}", got "${got}"`);
    process.exit(1);
  }
  console.log(`ok fix: "${text}" → "${got}"`);
}
