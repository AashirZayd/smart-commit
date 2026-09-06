# Smart Commit

> Intelligent, local-first conventional commits from your terminal.

[![npm version](https://img.shields.io/npm/v/smart-commit-cli?style=flat-square)](https://www.npmjs.com/package/smart-commit-cli)
[![Node version](https://img.shields.io/badge/node-%3E%3D20.12.0-brightgreen?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-66%20passing-brightgreen?style=flat-square)](https://github.com/AashirZayd/smart-commit)

Smart Commit analyzes your staged Git changes and suggests a conventional commit type, scope, and formatted message — without requiring an API key, cloud service, or AI provider.

---

## Terminal Preview

```text
$ smart-commit

✔ Checking git status...

Staged files:
  src/auth/login.js

Changes Summary:
Files: 1 | +24 additions | -2 deletions

Suggested commit type: feat (substantial new functionality added)

? Commit type: feat
? Scope: auth
? Commit message: add user session validation

✨ feat(auth): add user session validation

Commit created successfully
```

---

## What It Does

Smart Commit inspects your staged Git changes using deterministic, explainable heuristics:

* **Staged-Diff-Aware Type Detection**: Analyzes line deltas, file additions, modifications, renames, and deletions from `git diff --staged` rather than relying only on naive filename matching.
* **Hierarchy-Aware Scope Inference**: Automatically extracts the domain, module, or package from your project hierarchy (`src/auth/login.js` &rarr; `auth`, `packages/payments/src/card.js` &rarr; `payments`), skipping generic directories like `src` and `lib`.
* **Multi-File Dominance**: Identifies the primary domain across multiple changes while avoiding forced guesses on genuinely mixed changes.
* **Git Pre-Flight Safety**: Verifies repository state before touching Git history. Rejects bare repositories, warns on detached `HEAD`, and blocks execution during active merges, rebases, or unresolved conflicts.
* **Strict Index Fidelity**: Operates exclusively on staged files (`git add`). Unstaged modifications and untracked files are never committed automatically.

---

## Features

* **Staged Git Patch Intelligence**: Primary signal is derived from the actual code diff.
* **Conventional Commits**: Clean, standard format (`type(scope): message`) with optional Gitmoji.
* **Interactive & Quick Modes**: Guided interactive prompts or instant commits via `--quick`.
* **Cross-Platform**: Normalizes paths across Windows (`\`), macOS, and Linux (`/`).
* **False-Positive Protection**: Token-aware matching prevents substring mistakes (`address.js` won't trigger `feat`, `debug.js` won't trigger `fix`).
* **Local & Private by Design**: Zero external API calls, zero telemetry, zero cloud dependencies.

---

## Quick Install

Requires **Node.js &gt;=20.12.0** (native ES Modules).

Install globally:

```bash
npm install -g smart-commit-cli
```

Or run directly via `npx`:

```bash
npx smart-commit-cli
```

---

## Usage

### 1. Stage your changes

```bash
git add src/auth/login.js
```

### 2. Run Smart Commit

```bash
smart-commit
```

Follow the prompts to confirm or customize the commit type, inferred scope, and message.

### Quick Mode

To commit immediately using the automatically inferred type and scope:

```bash
smart-commit --quick
```

---

## Examples

| Staged Changes | Inferred Type | Inferred Scope | Resulting Header |
| --- | --- | --- | --- |
| `src/auth/oauth.js` (new file) | `feat` | `auth` | `feat(auth): ...` |
| `src/auth/login.js` (targeted bug fix) | `fix` | `auth` | `fix(auth): ...` |
| `docs/api/endpoints.md` | `docs` | `api` | `docs(api): ...` |
| `tests/auth/login.test.js` | `test` | `auth` | `test(auth): ...` |
| `styles/main.css` | `style` | none | `style: ...` |
| `package.json` | `chore` | none | `chore: ...` |
| `src/auth/login.js` + `README.md` | `feat` (code dominates) | `auth` | `feat(auth): ...` |
| `src/auth/login.js` + `src/payments/card.js` | `feat` | none (mixed) | `feat: ...` |

---

## CLI Reference

| Command / Option | Description |
| --- | --- |
| `smart-commit` | Launch interactive commit prompt |
| `smart-commit --quick` | Automatically create commit using inferred type and scope |
| `smart-commit --no-emoji` | Disable emoji prefix in commit messages |
| `smart-commit --help` | Display CLI help and available options |
| `smart-commit --version` | Display installed CLI version |

---

## Configuration

Smart Commit supports optional project-level configuration via a `.smartcommitrc` file in your repository root:

```json
{
  "types": {
    "feat": ["add", "feature", "implement", "create"],
    "fix": ["bug", "error", "patch", "resolve", "fix"],
    "docs": ["docs", "readme", "documentation"],
    "refactor": ["cleanup", "refactor", "optimize"],
    "test": ["test", "spec"],
    "chore": ["config", "build", "setup", "chore"]
  },
  "emoji": {
    "feat": "✨",
    "fix": "🐛",
    "docs": "📝",
    "refactor": "♻️",
    "test": "🧪",
    "chore": "🔧"
  }
}
```

---

## Conventional Commits

Smart Commit formats commit messages according to the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <description>
```

Common types supported:
* `feat`: A new feature or capability
* `fix`: A bug fix or logic correction
* `docs`: Documentation updates only
* `style`: Formatting or styling changes that do not affect code logic
* `refactor`: Code restructuring without adding features or fixing bugs
* `test`: Adding or updating test suites
* `chore`: Maintenance, dependencies, or configuration changes

---

## Local by Design

Smart Commit is built on a clear privacy and architecture principle:

* **No API Keys**: Works out of the box with standard Git installations.
* **No Cloud Services**: All analysis executes locally in Node.js on your machine.
* **No Telemetry**: Your source code and commit history are never collected or transmitted.
* **Fast & Deterministic**: Immediate response times without network latency.

---

## Development

To contribute or run tests locally:

```bash
# Clone the repository
git clone https://github.com/AashirZayd/smart-commit.git
cd smart-commit

# Install dependencies
npm install

# Run the test suite (Node.js built-in test runner)
npm test
```

Current test suite: **66 tests passing, 0 failures**.

---

## Documentation & Landing Page

Smart Commit includes a clean, standalone landing page in the [`docs/`](./docs) directory designed for GitHub Pages:

1. Go to repository **Settings** &rarr; **Pages**.
2. Under **Build and deployment** &gt; **Branch**, select `main` and `/docs`.
3. Click **Save** to publish.

---

## Project Status

Smart Commit is maintained as a focused, lightweight open-source CLI. Development emphasizes Git safety, reliability, and local repository intelligence.

---

## Support & Community

Smart Commit is free and open source. If Smart Commit saves you a few keystrokes, you can support its development with a [coffee](https://www.buymeacoffee.com/aashirzaydP).

Thank you to everyone who has used Smart Commit, reported an issue, or contributed to the project! You can view the project's [contributors on GitHub](https://github.com/AashirZayd/smart-commit/graphs/contributors).

---

## License

[MIT](./LICENSE) &copy; 2026 Aashir Zayd
