const simpleGit = require("simple-git")

const git = simpleGit()

async function getStagedFiles() {
  const status = await git.status()
  return status.staged
}

module.exports = { git, getStagedFiles }