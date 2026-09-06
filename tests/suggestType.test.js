import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"
import {
  suggestType,
  isDocsFile,
  isTestFile,
  isStyleFile,
  isChoreFile,
  isBinaryFile,
  isSourceFile,
  hasToken
} from "../src/suggestType.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")

test("Documentation-only changes infer docs", () => {
  assert.equal(isDocsFile("README.md"), true)
  assert.equal(isDocsFile("docs/api.md"), true)
  assert.equal(isDocsFile("CHANGELOG.md"), true)
  assert.equal(isDocsFile("CONTRIBUTING.md"), true)
  assert.equal(isDocsFile("LICENSE"), true)

  const result1 = suggestType(["README.md"])
  assert.equal(result1.type, "docs")

  const result2 = suggestType(["docs/api.md"])
  assert.equal(result2.type, "docs")

  const result3 = suggestType(["README.md", "docs/setup.md"])
  assert.equal(result3.type, "docs")
})

test("Test-only changes infer test", () => {
  assert.equal(isTestFile("tests/auth.test.js"), true)
  assert.equal(isTestFile("test/auth.test.ts"), true)
  assert.equal(isTestFile("src/__tests__/login.spec.js"), true)
  assert.equal(isTestFile("pkg/calc_test.go"), true)

  const result = suggestType(["tests/auth.test.js"])
  assert.equal(result.type, "test")

  const resultMulti = suggestType(["tests/auth.test.js", "tests/payment.spec.js"])
  assert.equal(resultMulti.type, "test")
})

test("Style-only changes infer style", () => {
  assert.equal(isStyleFile("styles/main.css"), true)
  assert.equal(isStyleFile("src/theme.scss"), true)
  assert.equal(isStyleFile(".prettierrc"), true)

  const result = suggestType(["styles/main.css"])
  assert.equal(result.type, "style")
})

test("Chore / configuration-only changes infer chore", () => {
  assert.equal(isChoreFile("package.json"), true)
  assert.equal(isChoreFile("package-lock.json"), true)
  assert.equal(isChoreFile(".gitignore"), true)
  assert.equal(isChoreFile(".github/workflows/ci.yml"), true)
  assert.equal(isChoreFile("tsconfig.json"), true)

  const result = suggestType(["package.json"])
  assert.equal(result.type, "chore")

  const resultMulti = suggestType(["package.json", "package-lock.json", ".gitignore"])
  assert.equal(resultMulti.type, "chore")
})

test("False-positive protection: substring tokens in filenames do not trigger incorrect types", () => {
  // address.js must NOT match 'add' -> feat
  assert.equal(hasToken("address.js", ["add"]), false)
  // debug.js must NOT match 'bug' -> fix
  assert.equal(hasToken("debug.js", ["bug"]), false)
  // contest.js must NOT match 'test' -> test
  assert.equal(hasToken("contest.js", ["test"]), false)
  assert.equal(isTestFile("contest.js"), false)
  assert.equal(isSourceFile("contest.js"), true)

  // Pure filename without diff or status falls back to neutral chore, NOT feat/fix/test
  assert.equal(suggestType(["address.js"]).type, "chore")
  assert.equal(suggestType(["debug.js"]).type, "chore")
  assert.equal(suggestType(["contest.js"]).type, "chore")
})

test("False-positive protection: patch comments containing 'TODO: fix this later' do not trigger fix", () => {
  const patch = `
diff --git a/src/auth/login.js b/src/auth/login.js
index 1234567..89abcdef 100644
--- a/src/auth/login.js
+++ b/src/auth/login.js
@@ -10,2 +10,4 @@
+// TODO: fix this later
+// add test coverage
+export function newFeature() {
+  return true;
+}
`
  const context = {
    diff: {
      files: 1,
      insertions: 5,
      deletions: 0,
      patch
    }
  }

  const result = suggestType(["src/auth/login.js"], context)
  // Should NOT be fix because the word fix only occurred in a comment
  assert.notEqual(result.type, "fix")
  assert.equal(result.type, "feat")
})

test("New implementation file additions infer feat", () => {
  const context = {
    status: {
      created: ["src/auth/oauth.js"],
      modified: [],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 1,
      insertions: 45,
      deletions: 0
    }
  }

  const result = suggestType(["src/auth/oauth.js"], context)
  assert.equal(result.type, "feat")
})

test("Existing implementation logic / error-handling modification infers fix", () => {
  const patch = `
diff --git a/src/auth/login.js b/src/auth/login.js
index 1111111..2222222 100644
--- a/src/auth/login.js
+++ b/src/auth/login.js
@@ -15,3 +15,5 @@
-  if (user == null) return false;
+  if (!user || !user.id) {
+    throw new Error("Invalid user");
+  }
`
  const context = {
    status: {
      created: [],
      modified: ["src/auth/login.js"],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 1,
      insertions: 4,
      deletions: 1,
      patch
    }
  }

  const result = suggestType(["src/auth/login.js"], context)
  assert.equal(result.type, "fix")
})

test("Refactor: balanced structural rewrite infers refactor", () => {
  const context = {
    status: {
      created: [],
      modified: ["src/auth/login.js"],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 1,
      insertions: 110,
      deletions: 105
    }
  }

  const result = suggestType(["src/auth/login.js"], context)
  assert.equal(result.type, "refactor")
})

test("Refactor: pure rename/move infers refactor", () => {
  const context = {
    status: {
      created: [],
      modified: [],
      deleted: [],
      renamed: [{ from: "src/auth/login.js", to: "src/auth/signin.js" }]
    },
    diff: {
      files: 1,
      insertions: 0,
      deletions: 0
    }
  }

  const result = suggestType(["src/auth/signin.js"], context)
  assert.equal(result.type, "refactor")
})

test("Mixed changes: implementation changes take precedence over docs, tests, and chores", () => {
  // src/auth/login.js + README.md
  const contextWithDocs = {
    status: {
      created: ["src/auth/login.js"],
      modified: ["README.md"],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 2,
      insertions: 25,
      deletions: 2
    }
  }
  const resDocs = suggestType(["src/auth/login.js", "README.md"], contextWithDocs)
  assert.notEqual(resDocs.type, "docs")
  assert.equal(resDocs.type, "feat")

  // src/auth/login.js + tests/auth.test.js
  const contextWithTest = {
    status: {
      created: ["src/auth/login.js", "tests/auth.test.js"],
      modified: [],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 2,
      insertions: 50,
      deletions: 0
    }
  }
  const resTest = suggestType(["src/auth/login.js", "tests/auth.test.js"], contextWithTest)
  assert.notEqual(resTest.type, "test")
  assert.equal(resTest.type, "feat")

  // src/auth/login.js + package.json
  const contextWithChore = {
    status: {
      created: ["src/auth/login.js"],
      modified: ["package.json"],
      deleted: [],
      renamed: []
    },
    diff: {
      files: 2,
      insertions: 30,
      deletions: 1
    }
  }
  const resChore = suggestType(["src/auth/login.js", "package.json"], contextWithChore)
  assert.notEqual(resChore.type, "chore")
  assert.equal(resChore.type, "feat")
})

test("Edge cases: empty files, binary assets, and pure deletions", () => {
  // Empty file list
  assert.equal(suggestType([]).type, "chore")
  assert.equal(suggestType(null).type, "chore")

  // Binary-only asset
  assert.equal(suggestType(["assets/logo.png"]).type, "chore")
  assert.equal(suggestType(["assets/logo.png"], { diff: { fileDetails: [{ file: "assets/logo.png", binary: true }] } }).type, "chore")

  // Pure deletion of source file
  const deleteContext = {
    status: {
      created: [],
      modified: [],
      deleted: ["src/legacy.js"],
      renamed: []
    },
    diff: {
      files: 1,
      insertions: 0,
      deletions: 80
    }
  }
  assert.equal(suggestType(["src/legacy.js"], deleteContext).type, "refactor")

  // Pure deletion of docs file
  const deleteDocContext = {
    status: {
      created: [],
      modified: [],
      deleted: ["docs/old.md"],
      renamed: []
    },
    diff: {
      files: 1,
      insertions: 0,
      deletions: 20
    }
  }
  assert.equal(suggestType(["docs/old.md"], deleteDocContext).type, "docs")
})

test("CLI Integration: --quick creates commit with diff-inferred type for new implementation", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-diff-feat-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Diff Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "diff@example.com"', { cwd: tempDir, stdio: "ignore" })

    const authDir = path.join(tempDir, "src", "auth")
    fs.mkdirSync(authDir, { recursive: true })
    fs.writeFileSync(
      path.join(authDir, "oauth.js"),
      'export function authenticate() { return "token"; }\n'
    )

    execSync("git add src/auth/oauth.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    assert.ok(log.includes("feat(auth): auto commit"), `Expected feat(auth): auto commit, got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI Integration: --quick creates commit with docs type for docs-only changes", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-diff-docs-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Diff Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "diff@example.com"', { cwd: tempDir, stdio: "ignore" })

    const apiDocsDir = path.join(tempDir, "docs", "api")
    fs.mkdirSync(apiDocsDir, { recursive: true })
    fs.writeFileSync(path.join(apiDocsDir, "endpoints.md"), "# API Endpoints\n\nEndpoints here.\n")

    execSync("git add docs/api/endpoints.md", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    assert.ok(log.includes("docs(api): auto commit"), `Expected docs(api): auto commit, got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI Integration: --quick creates commit with test type for test-only changes", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-diff-test-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Diff Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "diff@example.com"', { cwd: tempDir, stdio: "ignore" })

    const testsDir = path.join(tempDir, "tests", "auth")
    fs.mkdirSync(testsDir, { recursive: true })
    fs.writeFileSync(path.join(testsDir, "login.test.js"), "test('login', () => {});\n")

    execSync("git add tests/auth/login.test.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    assert.ok(log.includes("test(auth): auto commit"), `Expected test(auth): auto commit, got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI Integration: --quick favors implementation type when mixed with docs", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-diff-mixed-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Diff Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "diff@example.com"', { cwd: tempDir, stdio: "ignore" })

    const authDir = path.join(tempDir, "src", "auth")
    fs.mkdirSync(authDir, { recursive: true })
    fs.writeFileSync(path.join(authDir, "login.js"), "export function login() {}\n")
    fs.writeFileSync(path.join(tempDir, "README.md"), "# Auth Docs\n")

    execSync("git add src/auth/login.js README.md", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    // Must be feat(auth), NOT docs(auth) or docs
    assert.ok(log.includes("feat(auth): auto commit"), `Expected feat(auth): auto commit, got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
