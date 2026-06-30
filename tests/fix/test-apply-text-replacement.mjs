/** Smoke-test для applyTextReplacement и isFixable (дублирует src/fix.ts). */

function isFixable(issue) {
  if (issue.issueKind !== "text") return false;
  if (issue.ruleId === "spell-check" && !issue.replacement) return false;
  return true;
}

function applyTextReplacement(text, issue) {
  if (text.slice(issue.start, issue.end) !== issue.match) return null;
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  }
}

// замена
{
  const text = "50₽";
  const issue = {
    start: 0,
    end: 3,
    match: "50₽",
    replacement: "50 ₽",
  };
  const got = applyTextReplacement(text, issue);
  assert(got === "50 ₽", `replace: expected "50 ₽", got "${got}"`);
  console.log(`ok replace: "${text}" → "${got}"`);
}

// удаление
{
  const text = "50,00 ₽";
  const issue = {
    start: 2,
    end: 5,
    match: ",00",
    replacement: "",
  };
  const got = applyTextReplacement(text, issue);
  assert(got === "50 ₽", `delete: expected "50 ₽", got "${got}"`);
  console.log(`ok delete: "${text}" → "${got}"`);
}

// stale match
{
  const text = "hello world";
  const issue = {
    start: 0,
    end: 5,
    match: "hello",
    replacement: "hi",
  };
  const got = applyTextReplacement("changed world", issue);
  assert(got === null, "stale: expected null");
  console.log("ok stale match → null");
}

// isFixable: node issue
{
  const issue = {
    issueKind: "node",
    ruleId: "spacing-from-space",
    replacement: "",
  };
  assert(isFixable(issue) === false, "node issue should not be fixable");
  console.log("ok isFixable: node → false");
}

// isFixable: spell without suggestion
{
  const issue = {
    issueKind: "text",
    ruleId: "spell-check",
    replacement: "",
  };
  assert(isFixable(issue) === false, "spell without replacement should not be fixable");
  console.log("ok isFixable: spell-check empty → false");
}

// isFixable: text rule
{
  const issue = {
    issueKind: "text",
    ruleId: "currency-space",
    replacement: "50 ₽",
  };
  assert(isFixable(issue) === true, "text rule should be fixable");
  console.log("ok isFixable: text rule → true");
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}

console.log("\nAll tests passed");
