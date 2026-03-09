function suggestType(files) {

  const joined = files.join(" ").toLowerCase()

  if (joined.includes("fix") || joined.includes("bug")) {
    return {
      type: "fix",
      reason: "bug related changes detected"
    }
  }

  if (
    joined.includes("feature") ||
    joined.includes("auth") ||
    joined.includes("api") ||
    joined.includes("add")
  ) {
    return {
      type: "feat",
      reason: "new functionality detected"
    }
  }

  if (joined.includes("test")) {
    return {
      type: "test",
      reason: "test files detected"
    }
  }

  if (joined.includes("docs") || joined.includes("readme")) {
    return {
      type: "docs",
      reason: "documentation changes detected"
    }
  }

  return {
    type: "chore",
    reason: "general project changes"
  }
}

module.exports = { suggestType }