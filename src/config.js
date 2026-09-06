import fs from "node:fs"
import path from "node:path"

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

export { loadConfig }