const { loadConfig } = require("./config")

function suggestType(files) {

  const config = loadConfig()

  const rules = config?.types || {
    feat: ["add", "feature"],
    fix: ["bug", "error"],
    docs: ["docs", "readme"],
    refactor: ["cleanup"],
    chore: ["config"]
  }

  const joined = files.join(" ").toLowerCase()

  for (const type in rules) {
    for (const keyword of rules[type]) {
      if (joined.includes(keyword)) {
        return {
          type,
          reason: `matched "${keyword}"`
        }
      }
    }
  }

  return {
    type: "chore",
    reason: "default fallback"
  }
}

module.exports = { suggestType }