import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"
import {
  detectScopes,
  inferFileScope,
  normalizeGitPath,
  sanitizeScope
} from "../src/scopes.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")

test("Basic paths infer domain correctly", () => {
  assert.equal(inferFileScope("src/auth/login.js"), "auth")
  assert.deepEqual(detectScopes(["src/auth/login.js"]), ["auth"])

  assert.equal(inferFileScope("src/components/Button.jsx"), "components")
  assert.deepEqual(detectScopes(["src/components/Button.jsx"]), ["components"])
})

test("Windows paths with backslashes are normalized and infer scope identically", () => {
  assert.equal(inferFileScope("src\\auth\\login.js"), "auth")
  assert.deepEqual(detectScopes(["src\\auth\\login.js"]), ["auth"])

  assert.equal(inferFileScope("src\\components\\Button.jsx"), "components")
  assert.deepEqual(detectScopes(["src\\components\\Button.jsx"]), ["components"])

  assert.equal(normalizeGitPath("src\\auth\\login.js"), "src/auth/login.js")
  assert.equal(normalizeGitPath(".\\src\\auth\\login.js"), "src/auth/login.js")
})

test("Root-level files produce no scope (null / empty)", () => {
  assert.equal(inferFileScope("package.json"), null)
  assert.equal(inferFileScope("README.md"), null)
  assert.equal(inferFileScope(".gitignore"), null)
  assert.equal(inferFileScope("LICENSE"), null)
  assert.equal(inferFileScope("tsconfig.json"), null)
  assert.equal(inferFileScope("vite.config.js"), null)

  assert.deepEqual(detectScopes(["package.json"]), [])
  assert.deepEqual(detectScopes(["package.json", "README.md"]), [])
})

test("Generic container directories are skipped in favor of domain names", () => {
  assert.equal(inferFileScope("src/auth/login.js"), "auth")
  assert.equal(inferFileScope("lib/payment/client.js"), "payment")
  assert.equal(inferFileScope("test/auth/login.test.js"), "auth")
  assert.equal(inferFileScope("tests/auth/login.test.js"), "auth")
  assert.equal(inferFileScope("docs/api/endpoints.md"), "api")

  // Files directly under generic directories without sub-domains produce no scope
  assert.equal(inferFileScope("src/index.js"), null)
  assert.equal(inferFileScope("lib/index.js"), null)
})

test("Monorepo structures infer package / service / app boundary", () => {
  assert.equal(inferFileScope("packages/auth/src/login.js"), "auth")
  assert.deepEqual(detectScopes(["packages/auth/src/login.js"]), ["auth"])

  assert.equal(inferFileScope("apps/web/src/App.jsx"), "web")
  assert.deepEqual(detectScopes(["apps/web/src/App.jsx"]), ["web"])

  assert.equal(inferFileScope("services/payments/src/stripe.js"), "payments")
  assert.deepEqual(detectScopes(["services/payments/src/stripe.js"]), ["payments"])

  assert.equal(inferFileScope("modules/search/index.js"), "search")
  assert.deepEqual(detectScopes(["modules/search/index.js"]), ["search"])

  assert.equal(inferFileScope("plugins/analytics/index.js"), "analytics")
  assert.deepEqual(detectScopes(["plugins/analytics/index.js"]), ["analytics"])
})

test("Multiple files belonging to the same scope produce that scope", () => {
  const files = [
    "src/auth/login.js",
    "src/auth/logout.js",
    "src/auth/session.js"
  ]
  assert.deepEqual(detectScopes(files), ["auth"])
})

test("Multiple files with unrelated scopes produce no scope (do not invent certainty)", () => {
  const files = [
    "src/auth/login.js",
    "src/payments/card.js"
  ]
  assert.deepEqual(detectScopes(files), [])
})

test("Root-level files combined with scoped files preserve the dominant scope", () => {
  const files = [
    "package.json",
    "src/auth/login.js"
  ]
  assert.deepEqual(detectScopes(files), ["auth"])

  const monorepoFiles = [
    "README.md",
    "packages/payments/src/card.js"
  ]
  assert.deepEqual(detectScopes(monorepoFiles), ["payments"])
})

test("Deeply nested structures identify meaningful domain", () => {
  assert.equal(inferFileScope("src/features/auth/login/session.js"), "auth")
  assert.deepEqual(detectScopes(["src/features/auth/login/session.js"]), ["auth"])

  assert.equal(inferFileScope("src/services/payment/stripe.js"), "payment")
  assert.deepEqual(detectScopes(["src/services/payment/stripe.js"]), ["payment"])
})

test("Empty, missing, or invalid input returns empty array", () => {
  assert.deepEqual(detectScopes([]), [])
  assert.deepEqual(detectScopes(null), [])
  assert.deepEqual(detectScopes(undefined), [])
  assert.deepEqual(detectScopes([""]), [])
})

test("Duplicate file paths do not duplicate or corrupt scope detection", () => {
  const files = [
    "src/auth/login.js",
    "src/auth/login.js",
    "src\\auth\\login.js"
  ]
  assert.deepEqual(detectScopes(files), ["auth"])
})

test("Missing filesystem paths or renamed-style Git status strings work safely", () => {
  // Path does not exist on disk
  const nonExistent = "src/non-existent-folder/missing-file.ts"
  assert.equal(inferFileScope(nonExistent), "non-existent-folder")
  assert.deepEqual(detectScopes([nonExistent]), ["non-existent-folder"])

  // Renamed git status string "oldPath -> newPath"
  const renamed = "old/path/file.js -> src/auth/login.js"
  assert.equal(inferFileScope(renamed), "auth")
  assert.deepEqual(detectScopes([renamed]), ["auth"])
})

test("Scope normalization preserves hyphens and cleans edge characters", () => {
  assert.equal(sanitizeScope("user-service"), "user-service")
  assert.equal(sanitizeScope("USER_PROFILE"), "user_profile")
  assert.equal(sanitizeScope("./auth/"), "auth")
  assert.equal(sanitizeScope(""), null)
})

test("CLI Integration: --quick infers dominant scope in temporary Git repository", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-scope-auth-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Scope Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "scope@example.com"', { cwd: tempDir, stdio: "ignore" })

    const authDir = path.join(tempDir, "src", "auth")
    fs.mkdirSync(authDir, { recursive: true })
    fs.writeFileSync(path.join(authDir, "login.js"), "export function login() {}\n")
    fs.writeFileSync(path.join(authDir, "logout.js"), "export function logout() {}\n")

    execSync("git add src/auth/login.js src/auth/logout.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    assert.ok(log.includes("(auth)"), `Expected log to contain (auth), got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI Integration: --quick does not invent scope for mixed-scope changes", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-scope-mixed-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Scope Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "scope@example.com"', { cwd: tempDir, stdio: "ignore" })

    const authDir = path.join(tempDir, "src", "auth")
    const paymentsDir = path.join(tempDir, "src", "payments")
    fs.mkdirSync(authDir, { recursive: true })
    fs.mkdirSync(paymentsDir, { recursive: true })
    fs.writeFileSync(path.join(authDir, "login.js"), "export function login() {}\n")
    fs.writeFileSync(path.join(paymentsDir, "card.js"), "export function card() {}\n")

    execSync("git add src/auth/login.js src/payments/card.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    // Should NOT have (auth), (payments), (src), or any scope parentheses
    assert.ok(!log.includes("(auth)"), `Should not contain (auth): ${log}`)
    assert.ok(!log.includes("(payments)"), `Should not contain (payments): ${log}`)
    assert.ok(!log.includes("(src)"), `Should not contain (src): ${log}`)
    assert.ok(!log.includes("("), `Should not contain scope opening parenthesis: ${log}`)
    assert.ok(!log.includes(")"), `Should not contain scope closing parenthesis: ${log}`)
    assert.ok(log.includes(": auto commit"), `Expected commit to end with ': auto commit', got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI Integration: --quick preserves dominant scope when root file is also staged", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-scope-root-scoped-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Scope Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "scope@example.com"', { cwd: tempDir, stdio: "ignore" })

    const authDir = path.join(tempDir, "src", "auth")
    fs.mkdirSync(authDir, { recursive: true })
    fs.writeFileSync(path.join(authDir, "login.js"), "export function login() {}\n")
    fs.writeFileSync(path.join(tempDir, "package.json"), '{"name": "root-test"}\n')

    execSync("git add package.json src/auth/login.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    assert.ok(log.includes("(auth)"), `Expected log to contain (auth), got: ${log}`)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

