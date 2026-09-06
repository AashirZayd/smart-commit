import simpleGit from "simple-git"
import { git } from "./git.js"

async function getDiffSummary(cwd) {
  const instance = cwd ? simpleGit(cwd) : git

  const summary = await instance.diffSummary(["--staged"])

  let patch = ""
  try {
    patch = await instance.diff(["--staged"])
  } catch {
    patch = ""
  }

  return {
    files: summary.files.length,
    insertions: summary.insertions,
    deletions: summary.deletions,
    fileDetails: summary.files,
    patch
  }
}

export { getDiffSummary }