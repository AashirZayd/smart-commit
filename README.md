<div align="center">

<pre>

      ░██████   ░███     ░███    ░███    ░█████████  ░██████████     ░██████    ░██████   ░███     ░███ ░███     ░███ ░██████░██████████     ░██████  ░██         ░██████
     ░██   ░██  ░████   ░████   ░██░██   ░██     ░██     ░██        ░██   ░██  ░██   ░██  ░████   ░████ ░████   ░████   ░██      ░██        ░██   ░██ ░██           ░██  
    ░██         ░██░██ ░██░██  ░██  ░██  ░██     ░██     ░██       ░██        ░██     ░██ ░██░██ ░██░██ ░██░██ ░██░██   ░██      ░██       ░██        ░██           ░██  
     ░████████  ░██ ░████ ░██ ░█████████ ░█████████      ░██       ░██        ░██     ░██ ░██ ░████ ░██ ░██ ░████ ░██   ░██      ░██       ░██        ░██           ░██  
            ░██ ░██  ░██  ░██ ░██    ░██ ░██   ░██       ░██       ░██        ░██     ░██ ░██  ░██  ░██ ░██  ░██  ░██   ░██      ░██       ░██        ░██           ░██  
     ░██   ░██  ░██       ░██ ░██    ░██ ░██    ░██      ░██        ░██   ░██  ░██   ░██  ░██       ░██ ░██       ░██   ░██      ░██        ░██   ░██ ░██           ░██  
      ░██████   ░██       ░██ ░██    ░██ ░██     ░██     ░██         ░██████    ░██████   ░██       ░██ ░██       ░██ ░██████    ░██         ░██████  ░██████████ ░██████
                                                                                                                                                                         
                                                                                                                                                                         
                                                                                                                                                                        
</pre>

# Smart Commit CLI

**The intelligent commit architect for modern developers.**

Automatically analyze staged files, detect scopes, and generate clean **Conventional Commit** messages instantly.

</div>

---

<div align="center">

[![npm](https://img.shields.io/npm/v/smart-commit-cli?style=for-the-badge)](https://www.npmjs.com/package/smart-commit-cli)
![downloads](https://img.shields.io/npm/dt/smart-commit-cli?style=for-the-badge)
![license](https://img.shields.io/npm/l/smart-commit-cli?style=for-the-badge)
![stars](https://img.shields.io/github/stars/AashirZayd/smart-commit?style=for-the-badge)

</div>

---

# 🎬 Demo

<p align="center">
<img src="./assets/demo.gif" width="720"/>
</p>

---

# ✨ Capabilities

| Feature                   | Description                                                               |
| ------------------------- | ------------------------------------------------------------------------- |
| Intelligent Suggestions   | Detects whether your changes are a feature, fix, docs update, or refactor |
| Automatic Scope Detection | Infers commit scopes from directory structure                             |
| Interactive CLI           | Guided commit generation with clean prompts                               |
| Diff Summary              | Shows additions and deletions before committing                           |
| Emoji Support             | Optional Gitmoji-style commits                                            |
| Quick Mode                | Commit instantly using `--quick`                                          |

---

# ⚡ Quick Install

Install globally:

```bash
npm install -g smart-commit-cli
```

Or run instantly:

```bash
npx smart-commit-cli
```

Works on **Linux, macOS, and Windows**.

---

# 🛠 Usage

Stage your changes:

```bash
git add .
```

Run Smart Commit:

```bash
smart-commit
```

Example output:

```
🔍 Checking git status...

📦 Staged files:
src/auth/login.js

📊 Changes Summary:
Files: 1 | +20 additions | -3 deletions

🤖 Suggested commit type: feat

? Commit type: feat
? Scope: auth
? Commit message: add login validation

✨ feat(auth): add login validation
```

---

# ⚙ CLI Commands

```
smart-commit           # interactive commit workflow
smart-commit --quick   # auto commit using suggestion
smart-commit --no-emoji # disable emoji commits
smart-commit --help    # show CLI help
```

---

# 📸 Screenshots

### Commit detection

![Screenshot](./assets/screenshot1.png)

### Interactive prompt

![Screenshot](./assets/screenshot2.png)

### Commit preview

![Screenshot](./assets/screenshot3.png)

---

# 🏗 Roadmap

* AI-powered commit message generation
* `.smartcommitrc` configuration support
* Monorepo scope detection
* Git hook integration

---

# 🤝 Contributing

Clone the repo and run locally:

```bash
git clone https://github.com/AashirZayd/smart-commit-cli
cd smart-commit-cli
npm install
npm link
```

Run:

```bash
smart-commit
```

---

# 📄 License

MIT License

---

# 👤 Author

**Aashir Zayd**

GitHub
https://github.com/AashirZayd

---

⭐ If this project improves your workflow, consider giving it a star.
