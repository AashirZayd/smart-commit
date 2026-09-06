import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync, execSync } from "node:child_process"
import { getRepositoryState, isGitRepository, isBareRepository } from "../src/git.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BIN_PATH = path.resolve(__dirname, "../bin/index.js")

function createTempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-preflight-"))
  execSync("git init", { cwd: dir, stdio: "ignore" })
  execSync('git config user.name "PreFlight Tester"', { cwd: dir, stdio: "ignore" })
  execSync('git config user.email "preflight@example.com"', { cwd: dir, stdio: "ignore" })
  return dir
}

test("isGitRepository and isBareRepository identify non-git, normal, and bare repos", async () => {
  const nonGitDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-unit-nongit-"))
  const normalRepo = createTempRepo()
  const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-unit-bare-"))
  execSync("git init --bare", { cwd: bareDir, stdio: "ignore" })

  try {
    // Test in nonGitDir
    assert.equal(await isGitRepository(nonGitDir), false)
    assert.equal(await isBareRepository(nonGitDir), false)
    const nonGitState = await getRepositoryState(nonGitDir)
    assert.equal(nonGitState.isRepo, false)
    assert.equal(nonGitState.isBare, false)

    // Test in normalRepo
    assert.equal(await isGitRepository(normalRepo), true)
    assert.equal(await isBareRepository(normalRepo), false)
    const normalState = await getRepositoryState(normalRepo)
    assert.equal(normalState.isRepo, true)
    assert.equal(normalState.isBare, false)
    assert.equal(normalState.detached, false)

    // Test in bareDir
    assert.equal(await isGitRepository(bareDir), false)
    assert.equal(await isBareRepository(bareDir), true)
    const bareState = await getRepositoryState(bareDir)
    assert.equal(bareState.isRepo, false)
    assert.equal(bareState.isBare, true)
  } finally {
    fs.rmSync(nonGitDir, { recursive: true, force: true })
    fs.rmSync(normalRepo, { recursive: true, force: true })
    fs.rmSync(bareDir, { recursive: true, force: true })
  }
})

test("Pre-flight: non-Git directory reports human-friendly message and exits 1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-nongit-pf-"))
  try {
    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 1)
    assert.ok(res.stdout.includes("Smart Commit requires a Git repository."))
    assert.ok(res.stdout.includes("Run this command from inside a Git repository."))
    assert.ok(!res.stdout.includes("Checking git status..."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: bare repository reports diagnostic and exits 1", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sc-bare-pf-"))
  try {
    execSync("git init --bare", { cwd: dir, stdio: "ignore" })
    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 1)
    assert.ok(res.stdout.includes("Smart Commit cannot run in a bare Git repository."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: initial / zero-commit repository succeeds with --quick", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "init.txt"), "first commit")
    execSync("git add init.txt", { cwd: dir, stdio: "ignore" })

    const res = spawnSync(process.execPath, [BIN_PATH, "--quick"], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)
    assert.ok(res.stdout.includes("Commit created successfully"))

    const log = execSync("git log -1 --oneline", { cwd: dir, encoding: "utf8" }).trim()
    assert.ok(log.length > 0)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: detached HEAD displays warning but allows commit to proceed", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "base.txt"), "base")
    execSync("git add base.txt", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "base"', { cwd: dir, stdio: "ignore" })

    // Detach HEAD
    execSync("git checkout --detach", { cwd: dir, stdio: "ignore" })

    fs.writeFileSync(path.join(dir, "detached.txt"), "detached content")
    execSync("git add detached.txt", { cwd: dir, stdio: "ignore" })

    const res = spawnSync(process.execPath, [BIN_PATH, "--quick"], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)
    assert.ok(res.stdout.includes("Warning: You are currently in a detached HEAD state."))
    assert.ok(res.stdout.includes("Commit created successfully"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: untracked-only files are NOT automatically staged; exits 0", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "untracked.txt"), "untracked file")
    // Do NOT stage untracked.txt

    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)
    assert.ok(res.stdout.includes("No staged files found"))

    // Confirm file was not automatically staged
    const status = execSync("git status --porcelain", { cwd: dir, encoding: "utf8" }).trim()
    assert.ok(status.startsWith("??"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: staged new, modified, and deleted files work correctly", () => {
  const dir = createTempRepo()
  try {
    // Initial commit
    fs.writeFileSync(path.join(dir, "to_modify.txt"), "original")
    fs.writeFileSync(path.join(dir, "to_delete.txt"), "to delete")
    execSync("git add .", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "initial"', { cwd: dir, stdio: "ignore" })

    // 1. New file
    fs.writeFileSync(path.join(dir, "new_file.txt"), "new")
    // 2. Modified file
    fs.writeFileSync(path.join(dir, "to_modify.txt"), "modified")
    // 3. Deleted file
    fs.unlinkSync(path.join(dir, "to_delete.txt"))

    execSync("git add .", { cwd: dir, stdio: "ignore" })

    const res = spawnSync(process.execPath, [BIN_PATH, "--quick"], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)
    assert.ok(res.stdout.includes("Commit created successfully"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: commits ONLY staged changes; unstaged changes remain untouched", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "file_a.txt"), "staged version")
    fs.writeFileSync(path.join(dir, "file_b.txt"), "unstaged version")

    // Only stage file_a.txt
    execSync("git add file_a.txt", { cwd: dir, stdio: "ignore" })

    const res = spawnSync(process.execPath, [BIN_PATH, "--quick"], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)

    // Verify file_b.txt is still untracked/unstaged
    const status = execSync("git status --porcelain", { cwd: dir, encoding: "utf8" }).trim()
    assert.ok(status.includes("?? file_b.txt"))
    assert.ok(!status.includes("file_a.txt"))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: refuses to commit when unresolved merge conflicts exist", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "conflict.txt"), "base")
    execSync("git add conflict.txt", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "base"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout -b branch1", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "conflict.txt"), "branch1 version")
    execSync('git commit -am "branch1 change"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout master", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "conflict.txt"), "master version")
    execSync('git commit -am "master change"', { cwd: dir, stdio: "ignore" })

    try {
      execSync("git merge branch1", { cwd: dir, stdio: "ignore" })
    } catch {}

    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 1)
    assert.ok(res.stdout.includes("Unresolved merge conflicts detected."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: warns when merge is in progress with conflicts resolved", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "conflict.txt"), "base")
    execSync("git add conflict.txt", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "base"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout -b branch1", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "conflict.txt"), "branch1 version")
    execSync('git commit -am "branch1 change"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout master", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "conflict.txt"), "master version")
    execSync('git commit -am "master change"', { cwd: dir, stdio: "ignore" })

    try {
      execSync("git merge branch1", { cwd: dir, stdio: "ignore" })
    } catch {}

    // Resolve conflict by staging
    fs.writeFileSync(path.join(dir, "conflict.txt"), "resolved version")
    execSync("git add conflict.txt", { cwd: dir, stdio: "ignore" })

    const res = spawnSync(process.execPath, [BIN_PATH, "--quick"], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 0)
    assert.ok(res.stdout.includes("Warning: A Git merge is currently in progress. This will be a merge commit."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: refuses when rebase is in progress", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "rebase.txt"), "base")
    execSync("git add rebase.txt", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "base"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout -b branch1", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "rebase.txt"), "branch1 version")
    execSync('git commit -am "branch1 change"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout master", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "rebase.txt"), "master version")
    execSync('git commit -am "master change"', { cwd: dir, stdio: "ignore" })

    try {
      execSync("git rebase branch1", { cwd: dir, stdio: "ignore" })
    } catch {}

    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 1)
    assert.ok(res.stdout.includes("A Git rebase is currently in progress."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

test("Pre-flight: refuses when cherry-pick is in progress", () => {
  const dir = createTempRepo()
  try {
    fs.writeFileSync(path.join(dir, "cp.txt"), "base")
    execSync("git add cp.txt", { cwd: dir, stdio: "ignore" })
    execSync('git commit -m "base"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout -b branch1", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "cp.txt"), "branch1 version")
    execSync('git commit -am "branch1 change"', { cwd: dir, stdio: "ignore" })

    execSync("git checkout master", { cwd: dir, stdio: "ignore" })
    fs.writeFileSync(path.join(dir, "cp.txt"), "master version")
    execSync('git commit -am "master change"', { cwd: dir, stdio: "ignore" })

    try {
      execSync("git cherry-pick branch1", { cwd: dir, stdio: "ignore" })
    } catch {}

    const res = spawnSync(process.execPath, [BIN_PATH], { cwd: dir, encoding: "utf8" })
    assert.equal(res.status, 1)
    assert.ok(res.stdout.includes("A Git cherry-pick is currently in progress."))
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
