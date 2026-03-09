const inquirer = require("inquirer")
const chalk = require("chalk").default
const ora = require("ora").default

const { git, getStagedFiles } = require("./git")
const { detectScopes } = require("./scopes")
const { buildCommit } = require("./commit")
const { suggestType } = require("./suggestType")
const { getDiffSummary } = require("./diffSummary")
const emojis = require("./emojis")

module.exports = async function runCommit(options) {

  const spinner = ora("Checking git status...").start()

  const files = await getStagedFiles()

  spinner.stop()

  if (!files.length) {
    console.log(chalk.red("\nNo staged files found"))
    console.log(chalk.gray("Run: git add .\n"))
    return
  }

  console.log(chalk.gray("\nStaged files:"))
  files.forEach(f => console.log("  " + f))

  const diff = await getDiffSummary()

  console.log(chalk.yellow(
    `\nFiles: ${diff.files} | +${diff.insertions} | -${diff.deletions}`
  ))

  const suggestion = suggestType(files)

  console.log(
    chalk.cyan(
      `\nSuggested type: ${suggestion.type} (${suggestion.reason})`
    )
  )

  if (options.quick) {

    const commitMsg = buildCommit({
      type: suggestion.type,
      scope: "",
      message: "auto commit",
      emoji: emojis[suggestion.type] || ""
    })

    console.log("\n" + chalk.green(commitMsg))

    await git.commit(commitMsg)

    console.log(chalk.green("\nCommitted successfully\n"))

    return
  }

  const scopes = detectScopes(files)

  const prompt = inquirer.createPromptModule()

  const answers = await prompt([
    {
      type: "list",
      name: "type",
      message: "Commit type:",
      choices: [...new Set([
        suggestion.type,
        "feat",
        "fix",
        "docs",
        "refactor",
        "style",
        "test",
        "chore"
      ])]
    },
    {
      type: "list",
      name: "scope",
      message: "Scope:",
      choices: scopes.length ? [...scopes, "none"] : ["none"]
    },
    {
      type: "input",
      name: "message",
      message: "Commit message:"
    }
  ])

  const scope = answers.scope === "none" ? "" : answers.scope
  const emoji = emojis[answers.type] || ""

  const commit = buildCommit({
    type: answers.type,
    scope,
    message: answers.message,
    emoji
  })

  console.log("\n" + chalk.green("Commit Preview:\n"))
  console.log(chalk.yellow(commit))

  console.log("\nRun manually:")
  console.log(chalk.cyan(`git commit -m "${commit}"\n`))

  const confirm = await prompt([
    {
      type: "confirm",
      name: "commit",
      message: "Create commit?",
      default: true
    }
  ])

  if (confirm.commit) {

    await git.commit(commit)

    console.log(chalk.green("\nCommit created\n"))

  }

}