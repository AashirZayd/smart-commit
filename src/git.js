import fs from "node:fs"
import path from "node:path"
import simpleGit from "simple-git"

const git = simpleGit()

async function isGitRepository(cwd) {
  try {
    const instance = cwd ? simpleGit(cwd) : git
    return await instance.checkIsRepo()
  } catch {
    return false
  }
}

async function isBareRepository(cwd) {
  try {
    const instance = cwd ? simpleGit(cwd) : git
    return await instance.checkIsRepo("bare")
  } catch {
    return false
  }
}

async function getRepositoryState(cwd = process.cwd()) {
  const isRepo = await isGitRepository(cwd)
  if (!isRepo) {
    const isBare = await isBareRepository(cwd)
    return {
      isRepo: false,
      isBare,
      detached: false,
      hasConflicts: false,
      conflictedFiles: [],
      mergeInProgress: false,
      rebaseInProgress: false,
      cherryPickInProgress: false,
      stagedFiles: []
    }
  }

  const instance = simpleGit(cwd)
  const status = await instance.status()

  let resolvedGitDir = ""
  try {
    const rawGitDir = (await instance.revparse(["--git-dir"])).trim()
    resolvedGitDir = path.resolve(cwd, rawGitDir)
  } catch {}

  const mergeInProgress = resolvedGitDir
    ? fs.existsSync(path.join(resolvedGitDir, "MERGE_HEAD"))
    : false

  const cherryPickInProgress = resolvedGitDir
    ? fs.existsSync(path.join(resolvedGitDir, "CHERRY_PICK_HEAD"))
    : false

  const rebaseInProgress = resolvedGitDir
    ? fs.existsSync(path.join(resolvedGitDir, "rebase-merge")) ||
      fs.existsSync(path.join(resolvedGitDir, "rebase-apply"))
    : false

  return {
    isRepo: true,
    isBare: false,
    detached: Boolean(status.detached),
    hasConflicts: status.conflicted.length > 0,
    conflictedFiles: status.conflicted,
    mergeInProgress,
    rebaseInProgress,
    cherryPickInProgress,
    stagedFiles: status.staged,
    status
  }
}

async function getStagedFiles() {
  const status = await git.status()
  return status.staged
}

async function getStagedDiff(cwd) {
  try {
    const instance = cwd ? simpleGit(cwd) : git
    return await instance.diff(["--staged"])
  } catch {
    return ""
  }
}

export {
  git,
  getStagedFiles,
  getStagedDiff,
  isGitRepository,
  isBareRepository,
  getRepositoryState
}