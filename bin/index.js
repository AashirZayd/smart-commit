#!/usr/bin/env node

const inquirer = require("inquirer").default
const chalk = require("chalk").default
const ora = require("ora").default

const { git, getStagedFiles } = require("../src/git")
const { detectScopes } = require("../src/scopes")
const { buildCommit } = require("../src/commit")
const emojis = require("../src/emojis")

async function run() {

  const spinner = ora({
    text: "Checking git status...",
    spinner: "dots"
  }).start()

  const files = await getStagedFiles()

  spinner.stop()

  if (!files.length) {
    console.log(chalk.red("\nNo staged files found."))
    console.log(chalk.gray("Run: git add .\n"))
    process.exit()
  }

  console.log(chalk.gray("\nStaged files:"))
  files.forEach(f => console.log("  " + f))

  const scopes = detectScopes(files)

  const answers = await inquirer.prompt([

    {
      type: "list",
      name: "type",
      message: "Commit type:",
      choices: [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "test",
        "chore"
      ]
    },

    {
      type: "list",
      name: "scope",
      message: "Scope:",
      choices: [...scopes, "none"]
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

  const confirm = await inquirer.prompt([
    {
      type: "confirm",
      name: "commit",
      message: "Create this commit?"
    }
  ])

  if (confirm.commit) {

    await git.commit(commit)

    console.log(chalk.green("\nCommit created successfully"))
  }

}

run()