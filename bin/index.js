#!/usr/bin/env node

const inquirer = require("inquirer")
const chalk = require("chalk").default
const ora = require("ora").default

const { git, getStagedFiles } = require("../src/git")
const { detectScopes } = require("../src/scopes")
const { buildCommit } = require("../src/commit")
const emojis = require("../src/emojis")
const { suggestType } = require("../src/suggestType")
const { getDiffSummary } = require("../src/diffSummary")

const args = process.argv.slice(2)

const QUICK_MODE = args.includes("--quick")
const NO_EMOJI = args.includes("--no-emoji")

async function run() {

  try {

    const spinner = ora({
      text: "Checking git status...",
      spinner: "dots"
    }).start()

    const files = await getStagedFiles()

    spinner.stop()

    if (!files.length) {
      console.log(chalk.red("\nNo staged files found"))
      console.log(chalk.gray("Run: git add .\n"))
      process.exit()
    }

    console.log(chalk.gray("\nStaged files:"))
    files.forEach(f => console.log("  " + f))

    const diff = await getDiffSummary()

    console.log(chalk.gray("\nChanges Summary:"))
    console.log(
      chalk.yellow(
        `Files: ${diff.files} | +${diff.insertions} additions | -${diff.deletions} deletions`
      )
    )

    const suggestion = suggestType(files)

    console.log(
      chalk.cyan(
        `\nSuggested commit type: ${suggestion.type} (${suggestion.reason})`
      )
    )

    const scopes = detectScopes(files)

    if (QUICK_MODE) {

      const commit = buildCommit({
        type: suggestion.type,
        scope: "",
        message: "auto commit",
        emoji: NO_EMOJI ? "" : emojis[suggestion.type] || ""
      })

      console.log("\n" + chalk.green("Quick Commit:\n"))
      console.log(chalk.yellow(commit))

      await git.commit(commit)

      console.log(chalk.green("\nCommit created successfully\n"))

      return
    }

    const commitTypes = [
      suggestion.type,
      "feat",
      "fix",
      "docs",
      "style",
      "refactor",
      "test",
      "chore"
    ]

    const uniqueTypes = [...new Set(commitTypes)]

    const prompt = inquirer.createPromptModule()

    const answers = await prompt([
      {
        type: "list",
        name: "type",
        message: "Commit type:",
        choices: uniqueTypes
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
        message: "Commit message:",
        validate(input) {
          if (!input) return "Commit message cannot be empty"
          return true
        }
      }
    ])

    const scope = answers.scope === "none" ? "" : answers.scope
    const emoji = NO_EMOJI ? "" : emojis[answers.type] || ""

    const commit = buildCommit({
      type: answers.type,
      scope,
      message: answers.message,
      emoji
    })

    console.log("\n" + chalk.green("Commit Preview:\n"))
    console.log(chalk.yellow(commit))

    console.log("\nManual command:")
    console.log(chalk.cyan(`git commit -m "${commit}"\n`))

    const confirm = await prompt([
      {
        type: "confirm",
        name: "commit",
        message: "Create this commit now?",
        default: true
      }
    ])

    if (!confirm.commit) {
      console.log(chalk.gray("\nCommit skipped\n"))
      return
    }

    await git.commit(commit)

    console.log(chalk.green("\nCommit created successfully\n"))

  } catch (err) {

    console.log(chalk.red("\nError running smart-commit\n"))
    console.log(err.message)

  }

}

run()