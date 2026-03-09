const { git } = require("./git")

async function getDiffSummary() {

  const summary = await git.diffSummary(["--staged"])

  return {
    files: summary.files.length,
    insertions: summary.insertions,
    deletions: summary.deletions
  }

}

module.exports = { getDiffSummary }