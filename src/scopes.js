function detectScopes(files) {

  const scopes = new Set()

  files.forEach(file => {
    const parts = file.split("/")
    if (parts.length > 1) {
      scopes.add(parts[0])
    }
  })

  return Array.from(scopes)
}

module.exports = { detectScopes }