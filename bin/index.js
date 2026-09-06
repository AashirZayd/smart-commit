#!/usr/bin/env node

import fs from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { Command } from "commander"
import inquirer from "inquirer"
import chalk from "chalk"
import ora from "ora"

import { git, getStagedFiles, getRepositoryState } from "../src/git.js"
import { detectScopes } from "../src/scopes.js"
import { buildCommit } from "../src/commit.js"
import emojis from "../src/emojis.js"
import { suggestType } from "../src/suggestType.js"
import { getDiffSummary } from "../src/diffSummary.js"

const packageJsonUrl = new URL("../package.json", import.meta.url)
const packageJson = JSON.parse(fs.readFileSync(packageJsonUrl, "utf8"))
const VERSION = packageJson.version

function isPromptCancellationError(err) {
  if (!err) return false
  return (
    err.name === "ExitPromptError" ||
    err.name === "CancelPromptError" ||
    err.name === "AbortPromptError" ||
    (typeof err.message === "string" && err.message.includes("force closed the prompt with SIGINT"))
  )
}

async function run(options = {}) {
  const quickMode = Boolean(options.quick)
  const noEmoji = options.emoji === false || Boolean(options.noEmoji)
  let spinner = null

  const sigintHandler = () => {
    if (spinner && typeof spinner.stop === "function") {
      spinner.stop()
    }
    console.log(chalk.gray("\nCommit cancelled\n"))
    process.exit(130)
  }

  process.once("SIGINT", sigintHandler)

  try {

    const repoState = await getRepositoryState()

    if (!repoState.isRepo) {
      if (repoState.isBare) {
        console.log(chalk.red("\nSmart Commit cannot run in a bare Git repository."))
        console.log(chalk.gray("Run this command from inside a working Git repository.\n"))
        process.exit(1)
      }

      console.log(chalk.red("\nSmart Commit requires a Git repository."))
      console.log(chalk.gray("Run this command from inside a Git repository.\n"))
      process.exit(1)
    }

    if (repoState.rebaseInProgress) {
      console.log(chalk.red("\nA Git rebase is currently in progress."))
      console.log(chalk.gray('Use "git rebase --continue" or "git rebase --abort" to proceed.\n'))
      process.exit(1)
    }

    if (repoState.cherryPickInProgress) {
      console.log(chalk.red("\nA Git cherry-pick is currently in progress."))
      console.log(chalk.gray('Use "git cherry-pick --continue" or "git cherry-pick --abort" to proceed.\n'))
      process.exit(1)
    }

    if (repoState.hasConflicts) {
      console.log(chalk.red("\nUnresolved merge conflicts detected."))
      console.log(chalk.gray("Resolve conflicts and stage the resolved files before committing.\n"))
      process.exit(1)
    }

    if (repoState.detached) {
      console.log(chalk.yellow("\nWarning: You are currently in a detached HEAD state.\n"))
    }

    if (repoState.mergeInProgress) {
      console.log(chalk.yellow("\nWarning: A Git merge is currently in progress. This will be a merge commit.\n"))
    }

    const files = repoState.stagedFiles

    if (!files.length) {
      console.log(chalk.red("\nNo staged files found"))
      console.log(chalk.gray("Run: git add .\n"))
      process.exit(0)
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

    const suggestion = suggestType(files, { diff, repoState })

    console.log(
      chalk.cyan(
        `\nSuggested commit type: ${suggestion.type} (${suggestion.reason})`
      )
    )

    const scopes = detectScopes(files)

    if (quickMode) {

      const scope = scopes.length ? scopes[0] : ""

      const commit = buildCommit({
        type: suggestion.type,
        scope,
        message: "auto commit",
        emoji: noEmoji ? "" : emojis[suggestion.type] || ""
      })

      console.log("\n" + chalk.green("Quick Commit:\n"))
      console.log(chalk.yellow(commit))

      await git.commit(commit)

      console.log(chalk.green("\nCommit created successfully\n"))

      process.exit(0)
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
    const emoji = noEmoji ? "" : emojis[answers.type] || ""

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
      process.exit(0)
    }

    await git.commit(commit)

    console.log(chalk.green("\nCommit created successfully\n"))
    process.exit(0)

  } catch (err) {
    if (spinner && typeof spinner.stop === "function") {
      spinner.stop()
    }

    if (isPromptCancellationError(err)) {
      console.log(chalk.gray("\nCommit cancelled\n"))
      process.exit(130)
    }

    console.log(chalk.red("\nError running smart-commit\n"))
    console.log(err.message || String(err))
    process.exit(1)

  } finally {
    process.removeListener("SIGINT", sigintHandler)
  }

}

function createProgram() {
  const program = new Command()

  program
    .name("smart-commit")
    .description("Intelligent Git commit assistant")
    .version(VERSION, "-V, --version", "output the version number")
    .option("--quick", "Create a commit using quick mode")
    .option("--no-emoji", "Disable commit emoji")
    .action(async (opts) => {
      await run({
        quick: Boolean(opts.quick),
        emoji: opts.emoji !== false
      })
    })

  return program
}

async function main(argv = process.argv) {
  try {
    const program = createProgram()
    await program.parseAsync(argv)
  } catch (err) {
    console.log(chalk.red("\nError running smart-commit\n"))
    console.log(err.message || String(err))
    process.exit(1)
  }
}

const isMain =
  process.argv[1] &&
  path.resolve(fileURLToPath(import.meta.url)).toLowerCase() ===
    path.resolve(process.argv[1]).toLowerCase()

if (isMain) {
  main()
}

export { run, isPromptCancellationError, createProgram, main, VERSION }