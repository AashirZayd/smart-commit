
# 🚀 Smart Commit CLI

[![npm version](https://img.shields.io/npm/v/smart-commit-cli.svg?style=flat-square)](https://www.npmjs.com/package/smart-commit-cli)
[![license](https://img.shields.io/npm/l/smart-commit-cli.svg?style=flat-square)](https://github.com/aashirzayd/smart-commit-cli/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

**Stop overthinking your commit messages.** Smart Commit is an interactive CLI that analyzes your staged files, suggests the right [Conventional Commit](https://www.conventionalcommits.org/) type, detects scopes automatically, and generates clean, structured messages in seconds.

---

##  Features

*  **Intelligent Suggestions:** Analyzes code changes to recommend `feat`, `fix`, `docs`, and more.
*  **Auto-Scope Detection**: Infers the scope based on your file paths and directory structure.
*  **Interactive Prompts:** A guided experience that ensures your git history stays professional.
* **Diff Summary:** Preview a high-level summary of your additions and deletions before committing.
*  **Emoji Support:** Optional Gitmoji integration to make your logs more readable (and fun).
*  **Quick Mode:** Use `--quick` to bypass prompts and commit instantly with AI-suggested defaults.

---

##  Installation

Install globally using your preferred package manager:

```bash
# Using npm
npm install -g smart-commit-cli

# Using yarn
yarn global add smart-commit-cli

# Using pnpm
pnpm add -g smart-commit-cli

```

Or run it instantly without installing:

```bash
npx smart-commit-cli

```

---

##  Usage

### 1. Stage your changes

```bash
git add .

```

### 2. Run the CLI

```bash
smart-commit

```

### Command Line Flags

| Flag | Description |
| --- | --- |
| `--quick` | Skip the interactive flow and use the suggested message. |
| `--no-emoji` | Generate messages without the emoji prefix. |
| `--version` | Display current version. |
| `--help` | Show all available commands and flags. |

---

## 🎬 Example Flow

```text
 Checking git status...

 Staged files:
   modify: src/auth/login.ts
   modify: tests/auth.spec.ts

 Changes Summary:
   Files: 2 | +24 additions | -2 deletions

 Suggested type: feat (new functionality detected)

? Select commit type: feat
? Select scope: auth
? Enter commit message: add login validation logic

 Success! Generated commit:
 feat(auth): add login validation logic

```

---

##  Roadmap

*  **AI-Powered Messages:** Integration with LLMs for deep semantic code analysis.
*  **Custom Configurations:** Support for `.smartcommitrc` to define custom types and scopes.
*  **Monorepo Support:** Better scope detection for multi-package repositories.
*  **Git Hooks:** Easy setup as a `prepare-commit-msg` hook.

---

##  Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create.

1. **Fork** the Project.
2. Create your **Feature Branch** (`git checkout -b feature/AmazingFeature`).
3. **Commit** your changes (`smart-commit`).
4. **Push** to the Branch (`git push origin feature/AmazingFeature`).
5. Open a **Pull Request**.

---

##  License

Distributed under the MIT License. See `LICENSE` for more information.

##  Author

**Aashir Zayd**  **GitHub:** [@aashirzayd](https://www.google.com/search?q=https://github.com/aashirzayd)

* Twitter: [@aashirzayd](https://www.google.com/search?q=https://twitter.com/aashirzayd)

---

*Built with ❤️ for developers who value a clean git history.*

