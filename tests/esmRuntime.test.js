import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")

test("main CLI module imports cleanly in ESM runtime without ERR_REQUIRE_ESM", async () => {
  const mod = await import("../bin/index.js")
  assert.equal(typeof mod.run, "function")
  assert.equal(typeof mod.isPromptCancellationError, "function")
})

test("all src modules import cleanly as native ES modules", async () => {
  const commitMod = await import("../src/commit.js")
  assert.equal(typeof commitMod.buildCommit, "function")

  const gitMod = await import("../src/git.js")
  assert.ok(gitMod.git)
  assert.equal(typeof gitMod.getStagedFiles, "function")

  const scopesMod = await import("../src/scopes.js")
  assert.equal(typeof scopesMod.detectScopes, "function")

  const suggestMod = await import("../src/suggestType.js")
  assert.equal(typeof suggestMod.suggestType, "function")

  const diffMod = await import("../src/diffSummary.js")
  assert.equal(typeof diffMod.getDiffSummary, "function")

  const configMod = await import("../src/config.js")
  assert.equal(typeof configMod.loadConfig, "function")

  const emojisMod = await import("../src/emojis.js")
  assert.ok(emojisMod.default.feat)
})

test("CLI execution under child process does not produce module-resolution errors", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-esm-smoke-"))
  try {
    execSync("git init", { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.name "ESM Tester"', { cwd: tempDir, stdio: "ignore" })
    execSync('git config user.email "esm@example.com"', { cwd: tempDir, stdio: "ignore" })

    fs.writeFileSync(path.join(tempDir, "esm-file.js"), 'export const a = 1\n')
    execSync("git add esm-file.js", { cwd: tempDir, stdio: "ignore" })

    const result = spawnSync(process.execPath, [BIN_PATH, "--quick"], {
      cwd: tempDir,
      encoding: "utf8"
    })

    assert.equal(result.status, 0, `Expected 0, received: ${result.status}\nStderr: ${result.stderr}`)
    assert.ok(!result.stderr.includes("ERR_REQUIRE_ESM"))
    assert.ok(!result.stdout.includes("ERR_REQUIRE_ESM"))
    assert.ok(result.stdout.includes("Commit created successfully"))
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
