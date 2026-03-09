const fs = require("fs")
const path = require("path")

function loadConfig() {
  const configPath = path.join(process.cwd(), ".smartcommitrc")

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath)
      return JSON.parse(raw)
    } catch (err) {
      console.log("Invalid .smartcommitrc format")
    }
  }

  return null
}

module.exports = { loadConfig }