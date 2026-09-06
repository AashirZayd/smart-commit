import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"
import { isPromptCancellationError } from "../bin/index.js"
import { ExitPromptError, CancelPromptError, AbortPromptError } from "@inquirer/core"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")

test("isPromptCancellationError correctly identifies cancellation errors", () => {
  assert.equal(isPromptCancellationError(null), false)
  assert.equal(isPromptCancellationError(undefined), false)
  assert.equal(isPromptCancellationError(new Error("Generic failure")), false)
  assert.equal(isPromptCancellationError(new Error("fatal: not a git repository")), false)

  assert.equal(isPromptCancellationError({ name: "ExitPromptError" }), true)
  assert.equal(isPromptCancellationError({ name: "CancelPromptError" }), true)
  assert.equal(isPromptCancellationError({ name: "AbortPromptError" }), true)
  assert.equal(
    isPromptCancellationError(new Error("User force closed the prompt with SIGINT")),
    true
  )

  assert.equal(isPromptCancellationError(new ExitPromptError("User force closed the prompt with SIGINT")), true)
  assert.equal(isPromptCancellationError(new CancelPromptError("Prompt was canceled")), true)
  assert.equal(isPromptCancellationError(new AbortPromptError()), true)
})

test("CLI returns exit code 1 when executed outside a Git repository", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-nongit-"))
  try {
    const result = spawnSync(process.execPath, [BIN_PATH], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 1, `Expected exit code 1, received: ${result.status}`)
    assert.ok(
      result.stdout.includes("Error running smart-commit") ||
        result.stderr.includes("Error running smart-commit") ||
        result.stdout.includes("fatal: not a git repository") ||
        result.stdout.includes("Smart Commit requires a Git repository")
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI returns exit code 0 when staging area is empty", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-nostaged-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "SmartCommit Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "tester@example.com"', { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected exit code 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("No staged files found"))
    assert.ok(result.stdout.includes("Run: git add ."))
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI returns exit code 0 on successful commit (--quick mode)", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-success-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "SmartCommit Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "tester@example.com"', { cwd: tempDir, stdio: "ignore" })

    fs.writeFileSync(path.join(tempDir, "feature.js"), 'console.log("hello world")\n')
    execSync("git add feature.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected exit code 0, received: ${result.status}`)
    assert.ok(result.stdout.includes("Commit created successfully"))

    const gitLog = execSync("git log -1 --oneline", { cwd: tempDir, encoding: "utf8" })
    assert.ok(gitLog.length > 0)
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test("CLI returns exit code 1 when Git commit fails", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-failure-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "SmartCommit Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "tester@example.com"', { cwd: tempDir, stdio: "ignore" })

    fs.writeFileSync(path.join(tempDir, "feature.js"), 'console.log("will fail")\n')
    execSync("git add feature.js", { cwd: tempDir, stdio: "ignore" })

    // Install a pre-commit hook that exits with non-zero
    const hooksDir = path.join(tempDir, ".git", "hooks")
    fs.mkdirSync(hooksDir, { recursive: true })
    const hookFile = path.join(hooksDir, "pre-commit")
    fs.writeFileSync(hookFile, "#!/bin/sh\necho 'pre-commit hook rejected commit' >&2\nexit 1\n")
    try {
      fs.chmodSync(hookFile, 0o755)
    } catch {}

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 1, `Expected exit code 1, received: ${result.status}`)
    assert.ok(
      result.stdout.includes("Error running smart-commit") ||
        result.stderr.includes("Error running smart-commit")
    )
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
