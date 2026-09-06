import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"
import { VERSION, createProgram } from "../bin/index.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")
const packageJson = JSON.parse(
  fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")
)

test("VERSION exported from bin/index.js matches package.json dynamically", () => {
  assert.equal(VERSION, packageJson.version)
})

test("CLI --help displays usage, options, and exits with code 0", () => {
  const result = spawnSync(process.execPath, [BIN_PATH, "--help"], {
    encoding: "utf8"
  })

  assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
  assert.ok(result.stdout.includes("Usage: smart-commit [options]"))
  assert.ok(result.stdout.includes("--quick"))
  assert.ok(result.stdout.includes("--no-emoji"))
  assert.ok(result.stdout.includes("--version"))
  assert.ok(result.stdout.includes("--help"))

  // Verify no git operations or prompts occurred
  assert.ok(!result.stdout.includes("fatal:"))
  assert.ok(!result.stdout.includes("Checking git status..."))
  assert.ok(!result.stderr.includes("fatal:"))
})

test("CLI --version prints package.json version and exits with code 0", () => {
  const result = spawnSync(process.execPath, [BIN_PATH, "--version"], {
    encoding: "utf8"
  })

  assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
  assert.equal(result.stdout.trim(), packageJson.version)

  // Verify no git operations occurred
  assert.ok(!result.stdout.includes("Checking git status..."))
  assert.ok(!result.stdout.includes("fatal:"))
  assert.ok(!result.stderr.includes("fatal:"))
})

test("CLI with invalid option exits with non-zero code and reports error", () => {
  const result = spawnSync(process.execPath, [BIN_PATH, "--definitely-invalid"], {
    encoding: "utf8"
  })

  assert.notEqual(result.status, 0, `Expected non-zero, received: ${result.status}`)
  assert.ok(
    result.stderr.includes("unknown option '--definitely-invalid'") ||
      result.stdout.includes("unknown option '--definitely-invalid'")
  )
  // Verify it did not attempt to run the commit flow
  assert.ok(!result.stdout.includes("Checking git status..."))
})

test("CLI with --quick creates commit with emoji by default", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-quick-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "Quick Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "quick@example.com"', { cwd: tempDir, stdio: "ignore" })

    fs.writeFileSync(path.join(tempDir, "feature.js"), 'console.log("quick")\n')
    execSync("git add feature.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    // For feature.js, suggested type is feat and emoji is ✨
    assert.ok(log.includes("✨"))
    assert.ok(log.includes("feat: auto commit"))
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI with --quick and --no-emoji creates commit without emoji", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-noemoji-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "NoEmoji Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "noemoji@example.com"', { cwd: tempDir, stdio: "ignore" })

    fs.writeFileSync(path.join(tempDir, "feature.js"), 'console.log("no emoji")\n')
    execSync("git add feature.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick", "--no-emoji"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --pretty=%B", { cwd: tempDir, encoding: "utf8" }).trim()
    // Must NOT contain emoji
    assert.ok(!log.includes("✨"))
    assert.equal(log, "feat: auto commit")
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("createProgram configures command options correctly", () => {
  const program = createProgram()
  assert.equal(program.name(), "smart-commit")
  const optionNames = program.options.map((opt) => opt.name())
  assert.ok(optionNames.includes("quick"))
  assert.ok(optionNames.includes("no-emoji"))
})
